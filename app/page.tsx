"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dateInputToDateKey,
  dateKeyToDateInput,
  generateDiaryTheme,
  isValidDateKey,
} from "@/lib/theme";

type DiaryEntry = {
  dateKey: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export default function Home() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [dateKey, setDateKey] = useState<string>(todayDateKey());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState<{ createdAt?: string; updatedAt?: string }>({});
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const theme = useMemo(() => generateDiaryTheme(dateKey), [dateKey]);

  // 리스트/선택 동기화
  useEffect(() => {
    let cancelled = false;
    async function loadEntries() {
      setLoadingList(true);
      setMessage(null);
      try {
        const res = await fetch("/api/diary");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "목록 조회에 실패했습니다.");
        if (cancelled) return;
        const list = (data?.entries as DiaryEntry[]) ?? [];
        setEntries(list);

        const existing = list.find((e) => e.dateKey === dateKey);
        if (existing) {
          setTitle(existing.title);
          setContent(existing.content);
          setMeta({ createdAt: existing.createdAt, updatedAt: existing.updatedAt });
        } else {
          setTitle("");
          setContent("");
          setMeta({});
        }
      } catch (e: any) {
        if (!cancelled) setMessage(e?.message ?? "목록 조회 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    loadEntries();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 날짜 변경 시 로컬 리스트에서 선택
  useEffect(() => {
    const existing = entries.find((e) => e.dateKey === dateKey);
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content);
      setMeta({ createdAt: existing.createdAt, updatedAt: existing.updatedAt });
    } else {
      setTitle("");
      setContent("");
      setMeta({});
    }
  }, [dateKey, entries]);

  async function onSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/diary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey, title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "저장에 실패했습니다.");
      const entry = data?.entry as DiaryEntry;
      setEntries((prev) => {
        const others = prev.filter((e) => e.dateKey !== entry.dateKey);
        return [...others, entry].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      });
      setMeta({ createdAt: entry.createdAt, updatedAt: entry.updatedAt });
      setMessage("저장했습니다.");
    } catch (e: any) {
      setMessage(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("이 날짜의 기록을 삭제할까요?")) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/diary?dateKey=${dateKey}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "삭제에 실패했습니다.");
      setEntries((prev) => prev.filter((e) => e.dateKey !== dateKey));
      setTitle("");
      setContent("");
      setMeta({});
      setMessage(data?.deleted ? "삭제했습니다." : "삭제할 기록이 없었습니다.");
    } catch (e: any) {
      setMessage(e?.message ?? "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const dateValue = isValidDateKey(dateKey) ? dateKeyToDateInput(dateKey) : "";

  return (
    <main
      className="min-h-screen p-6"
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl p-5 border border-black/10 bg-white/15 backdrop-blur">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl font-semibold">개인 다이어리</h1>
              <p className="text-sm opacity-80">한 페이지에서 목록 + 작성/수정/삭제</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm opacity-90" htmlFor="date">
                날짜
              </label>
              <input
                id="date"
                type="date"
                value={dateValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setDateKey("");
                    return;
                  }
                  setDateKey(dateInputToDateKey(v));
                }}
                className="rounded-md px-3 py-2 text-sm"
                style={{ color: "#111", backgroundColor: "#fff" }}
                aria-label="날짜 선택"
              />
            </div>
          </header>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="title">
                제목
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="오늘의 제목을 입력하세요"
                className="w-full rounded-md px-3 py-2"
                style={{ color: "#111", backgroundColor: "#fff" }}
                disabled={saving || deleting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="content">
                내용
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘의 내용을 기록하세요"
                className="w-full rounded-md px-3 py-2 min-h-48"
                style={{ color: "#111", backgroundColor: "#fff" }}
                disabled={saving || deleting}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onSave}
                disabled={saving || deleting}
                className="rounded-md px-4 py-2 text-sm font-medium bg-black/80 text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장/수정"}
              </button>
              <button
                onClick={onDelete}
                disabled={saving || deleting}
                className="rounded-md px-4 py-2 text-sm font-medium bg-white/20 border border-black/10 disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>

              <div className="ml-auto text-xs opacity-80">
                <div>dateKey: {dateKey}</div>
                {meta.createdAt ? (
                  <div>생성: {new Date(meta.createdAt).toLocaleString()}</div>
                ) : null}
                {meta.updatedAt ? (
                  <div>수정: {new Date(meta.updatedAt).toLocaleString()}</div>
                ) : null}
              </div>
            </div>

            {message ? <div className="text-sm font-medium">{message}</div> : null}
          </div>
        </section>

        <section className="rounded-2xl p-5 border border-black/10 bg-white/10 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">다이어리 목록</h2>
            {loadingList ? <span className="text-xs opacity-80">불러오는 중...</span> : null}
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {entries.length === 0 ? (
              <div className="text-sm opacity-80">저장된 기록이 없습니다.</div>
            ) : (
              entries.map((entry) => (
                <button
                  key={entry.dateKey}
                  onClick={() => setDateKey(entry.dateKey)}
                  className={`w-full text-left rounded-lg px-3 py-2 border transition ${
                    entry.dateKey === dateKey
                      ? "border-black/50 bg-white/60 text-black"
                      : "border-black/10 bg-white/20 hover:bg-white/30"
                  }`}
                  style={{ color: entry.dateKey === dateKey ? "#111" : "inherit" }}
                >
                  <div className="text-sm font-semibold">
                    {entry.dateKey.slice(0, 4)}-{entry.dateKey.slice(4, 6)}-{entry.dateKey.slice(6, 8)}
                  </div>
                  <div className="text-sm truncate">{entry.title || "(제목 없음)"}</div>
                  <div className="text-xs opacity-80 truncate">
                    {/*entry.content?.replace(/\s+/g, " ").slice(0, 80)*/}
                    {entry.content}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 text-xs opacity-80">
            테마: 배경 {theme.backgroundColor}, 텍스트 {theme.textColor}
          </div>
        </section>
      </div>
    </main>
  );
}
