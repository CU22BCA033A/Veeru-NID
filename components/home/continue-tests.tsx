"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import { draft } from "@/lib/offline/queue";

export interface ResumableTest {
  /** Runner storage key, e.g. `daily:<planId>` */
  key: string;
  label: string;
  href: string;
  total: number;
}

type Found = ResumableTest & { answered: number; at: number };

/**
 * "Continue where you stopped": tests paused or left half-way keep their answers on this phone
 * (see Runner), so offer them first. Open mocks come from the server.
 */
export function ContinueTests({ tests, openMock }: { tests: ResumableTest[]; openMock: { label: string; href: string } | null }) {
  const [found, setFound] = useState<Found[]>([]);
  useEffect(() => {
    const list: Found[] = [];
    for (const t of tests) {
      const d = draft.load<{ entries?: Record<string, { answer: unknown }>; index?: number } | null>(t.key, null);
      if (!d?.entries) continue;
      const answered = Object.values(d.entries).filter((e) => e.answer !== null && e.answer !== undefined && e.answer !== "" && !(Array.isArray(e.answer) && !e.answer.length)).length;
      if (answered > 0) list.push({ ...t, answered, at: (d.index ?? 0) + 1 });
    }
    setFound(list);
  }, [tests]);
  const rows = [...found.map((f) => ({ key: f.key, href: f.href, title: `Continue: ${f.label}`, note: `${f.answered} of ${f.total} answered · you were on question ${f.at}` })), ...(openMock ? [{ key: "mock", href: openMock.href, title: `Continue: ${openMock.label}`, note: "Your mock is still open. The clock is stopped only if you paused it." }] : [])];
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Link key={r.key} href={r.href} className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-accent bg-accent-soft px-4 py-3">
          <PlayCircle className="size-6 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{r.title}</span>
            <span className="block text-xs text-ink-2">{r.note}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
