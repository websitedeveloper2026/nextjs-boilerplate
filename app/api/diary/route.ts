import { NextResponse } from "next/server";
import {
  deleteDiaryEntry,
  getDiaryEntry,
  listDiaryEntries,
  upsertDiaryEntry,
} from "@/lib/diaryStore";
import {
  clampContent,
  clampTitle,
  isValidDateKey,
  sanitizeField,
} from "@/lib/theme";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey");

  if (dateKey) {
    if (!isValidDateKey(dateKey)) return badRequest("Invalid dateKey. Expected yyyyMMdd.");
    const entry = await getDiaryEntry(dateKey);
    return NextResponse.json({ entry }, { status: 200 });
  }

  const entries = await listDiaryEntries();
  return NextResponse.json({ entries }, { status: 200 });
}

export async function PUT(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const dateKey = body?.dateKey as string | undefined;
  const titleRaw = body?.title as string | undefined;
  const contentRaw = body?.content as string | undefined;

  if (!dateKey || !isValidDateKey(dateKey)) return badRequest("Invalid dateKey. Expected yyyyMMdd.");
  if (typeof titleRaw !== "string") return badRequest("Invalid title.");
  if (typeof contentRaw !== "string") return badRequest("Invalid content.");

  const title = clampTitle(sanitizeField(titleRaw));
  const content = clampContent(sanitizeField(contentRaw));
  if (title.length < 1) return badRequest("Title is required.");

  const entry = await upsertDiaryEntry({ dateKey, title, content });
  return NextResponse.json({ entry }, { status: 200 });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey") ?? "";
  if (!isValidDateKey(dateKey)) return badRequest("Invalid dateKey. Expected yyyyMMdd.");
  const deleted = await deleteDiaryEntry(dateKey);
  return NextResponse.json({ deleted }, { status: 200 });
}

