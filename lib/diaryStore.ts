import { promises as fs } from "node:fs";
import path from "node:path";
import { diaryMutex } from "@/lib/mutex";
import { escapeTsvField, unescapeTsvField } from "@/lib/tsv";

export type DiaryEntry = {
  dateKey: string; // yyyyMMdd
  title: string;
  content: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "diary.tsv");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

function parseTsv(content: string): Map<string, DiaryEntry> {
  const map = new Map<string, DiaryEntry>();
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 5) continue;
    const [dateKey, title, contentField, createdAt, updatedAt] = cols;
    map.set(dateKey, {
      dateKey,
      title: unescapeTsvField(title ?? ""),
      content: unescapeTsvField(contentField ?? ""),
      createdAt: createdAt ?? "",
      updatedAt: updatedAt ?? "",
    });
  }
  return map;
}

function serializeTsv(entries: Iterable<DiaryEntry>): string {
  const lines: string[] = [];
  for (const e of entries) {
    lines.push(
      [
        e.dateKey,
        escapeTsvField(e.title ?? ""),
        escapeTsvField(e.content ?? ""),
        e.createdAt ?? "",
        e.updatedAt ?? "",
      ].join("\t")
    );
  }
  return lines.join("\n") + (lines.length ? "\n" : "");
}

async function atomicWriteFile(targetPath: string, data: string): Promise<void> {
  const dir = path.dirname(targetPath);
  const tmpPath = path.join(dir, `.${path.basename(targetPath)}.${Date.now()}.tmp`);
  await fs.writeFile(tmpPath, data, "utf8");
  await fs.rm(targetPath, { force: true });
  await fs.rename(tmpPath, targetPath);
}

export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  const release = await diaryMutex.acquire();
  try {
    await ensureDataDir();
    const raw = (await readFileIfExists(DATA_FILE)) ?? "";
    const map = parseTsv(raw);
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  } finally {
    release();
  }
}

export async function getDiaryEntry(dateKey: string): Promise<DiaryEntry | null> {
  const release = await diaryMutex.acquire();
  try {
    await ensureDataDir();
    const raw = await readFileIfExists(DATA_FILE);
    if (!raw) return null;
    const map = parseTsv(raw);
    return map.get(dateKey) ?? null;
  } finally {
    release();
  }
}

export async function upsertDiaryEntry(input: {
  dateKey: string;
  title: string;
  content: string;
}): Promise<DiaryEntry> {
  const release = await diaryMutex.acquire();
  try {
    await ensureDataDir();
    const now = new Date().toISOString();
    const raw = (await readFileIfExists(DATA_FILE)) ?? "";
    const map = parseTsv(raw);
    const existing = map.get(input.dateKey);
    const entry: DiaryEntry = {
      dateKey: input.dateKey,
      title: input.title,
      content: input.content,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    map.set(input.dateKey, entry);
    const sorted = Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    await atomicWriteFile(DATA_FILE, serializeTsv(sorted));
    return entry;
  } finally {
    release();
  }
}

export async function deleteDiaryEntry(dateKey: string): Promise<boolean> {
  const release = await diaryMutex.acquire();
  try {
    await ensureDataDir();
    const raw = (await readFileIfExists(DATA_FILE)) ?? "";
    const map = parseTsv(raw);
    const existed = map.delete(dateKey);
    const sorted = Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    await atomicWriteFile(DATA_FILE, serializeTsv(sorted));
    return existed;
  } finally {
    release();
  }
}

