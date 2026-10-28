"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Grid3x3, Clock, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ItemView, type ItemValue } from "@/components/item/item-view";
import { SourceBadge } from "@/components/item/source-badge";
import { cn } from "@/lib/cn";
import type { AttemptInput, ClientItem } from "@/lib/items/types";
import { draft, queueSubmission } from "@/lib/offline/queue";

export interface RunnerSubmit {
  key: string;
  context: "warmup" | "daily" | "homework" | "drill";
  planId: string | null;
  attempts: AttemptInput[];
  /** homework ids being completed, parallel to attempts when context = homework */
  homeworkIds?: string[];
}

interface Entry {
  answer: ItemValue;
  confidence: "sure" | "guess" | null;
  timeMs: number;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Runner({
  storageKey, items, context, planId, minAnswered, submit, doneHref, title, homeworkIds, submitLabel = "Submit & see results",
}: {
  storageKey: string;
  items: ClientItem[];
  context: RunnerSubmit["context"];
  planId: string | null;
  minAnswered: number;
  submit: (p: RunnerSubmit) => Promise<{ ok: boolean; error?: string }>;
  doneHref: string;
  title: string;
  homeworkIds?: string[];
  submitLabel?: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [index, setIndex] = useState(0);
  const [showNav, setShowNav] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const saved = draft.load<{ entries: Record<string, Entry>; index: number }>(storageKey, { entries: {}, index: 0 });
    setEntries(saved.entries);
    setIndex(Math.min(saved.index, items.length - 1));
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(t);
  }, [storageKey, items.length]);

  const item = items[index]!;
  const entry = entries[item.id];
  const answeredCount = useMemo(
    () => items.filter((i) => { const a = entries[i.id]?.answer; return a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && !a.length); }).length,
    [entries, items],
  );

  /** Add the time spent on the current item, then move. */
  const go = (next: number) => {
    const spent = Date.now() - shownAt.current;
    shownAt.current = Date.now();
    setEntries((prev) => {
      const e = prev[item.id] ?? { answer: null, confidence: null, timeMs: 0 };
      const updated = { ...prev, [item.id]: { ...e, timeMs: e.timeMs + spent } };
      draft.save(storageKey, { entries: updated, index: next });
      return updated;
    });
    setIndex(Math.max(0, Math.min(items.length - 1, next)));
    setShowNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const update = (patch: Partial<Entry>) =>
    setEntries((prev) => {
      const e = prev[item.id] ?? { answer: null, confidence: null, timeMs: 0 };
      const updated = { ...prev, [item.id]: { ...e, ...patch } };
      draft.save(storageKey, { entries: updated, index });
      return updated;
    });

  const doSubmit = () => {
    const spent = Date.now() - shownAt.current;
    const final = { ...entries, [item.id]: { ...(entries[item.id] ?? { answer: null, confidence: null, timeMs: 0 }), timeMs: (entries[item.id]?.timeMs ?? 0) + spent } };
    const payload: RunnerSubmit = {
      key: storageKey, context, planId, homeworkIds,
      attempts: items.map((i) => ({
        itemId: i.id,
        answer: final[i.id]?.answer ?? null,
        confidence: final[i.id]?.confidence ?? null,
        timeMs: Math.round(final[i.id]?.timeMs ?? 0),
        clientId: `${storageKey}:${i.id}`,
      })),
    };
    start(async () => {
      try {
        if (!navigator.onLine) throw new Error("offline");
        const res = await submit(payload);
        if (!res.ok) {
          setMessage(res.error ?? "Couldn't submit. Try again.");
          return;
        }
        draft.clear(storageKey);
        router.push(doneHref);
        router.refresh();
      } catch {
        queueSubmission(storageKey, payload);
        setMessage("You're offline. Your answers are saved on this phone and will be submitted automatically when you're back online.");
      }
    });
  };

  const isAnswered = (i: ClientItem) => {
    const a = entries[i.id]?.answer;
    return a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && !a.length);
  };
  const last = index === items.length - 1;
  const canSubmit = answeredCount >= Math.min(minAnswered, items.length);

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-line bg-paper/95 px-4 pb-3 pt-3 backdrop-blur md:top-[57px]">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{title}</span>
          <span className="flex items-center gap-3 text-ink-2">
            <span className="flex items-center gap-1 tabular-nums" aria-label="Time elapsed">
              <Clock className="size-4" aria-hidden /> {fmt(elapsed)}
            </span>
            <span className="tabular-nums">
              {index + 1}/{items.length}
            </span>
            <button type="button" onClick={() => setShowNav((v) => !v)} className="flex min-h-9 items-center gap-1 rounded-lg px-2 hover:bg-surface-2" aria-expanded={showNav} aria-label="Question navigator">
              <Grid3x3 className="size-4" aria-hidden />
            </button>
          </span>
        </div>
        <ProgressBar value={answeredCount} max={items.length} label="Answered" className="mt-2" />
        {showNav && (
          <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => go(i)}
                className={cn(
                  "h-9 rounded-lg border text-xs tabular-nums",
                  i === index ? "border-accent bg-accent text-accent-ink" : isAnswered(it) ? "border-good bg-good-soft text-good" : "border-line bg-surface",
                )}
                aria-label={`Question ${i + 1}${isAnswered(it) ? ", answered" : ""}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge>{item.categoryName}</Badge>
        <span className="text-xs text-ink-3">{item.subtopicName}</span>
        <SourceBadge source={item.source} />
        {item.review && <Badge tone="warn">Review</Badge>}
      </div>

      <ItemView key={item.id} item={item} value={entry?.answer ?? null} onChange={(v) => update({ answer: v })} />

      {item.type !== "short" && (
        <div className="mt-5 flex items-center gap-2" role="group" aria-label="How sure are you?">
          <span className="text-sm text-ink-2">How sure?</span>
          {(["sure", "guess"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update({ confidence: entry?.confidence === c ? null : c })}
              aria-pressed={entry?.confidence === c}
              className={cn("min-h-10 rounded-full border px-4 text-sm capitalize", entry?.confidence === c ? "border-ink bg-ink text-paper" : "border-line")}
            >
              {c === "sure" ? "Sure" : "Guess"}
            </button>
          ))}
        </div>
      )}

      {message && (
        <p role="status" className="mt-5 flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden /> {message}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question">
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="flex-1 text-center text-xs text-ink-3">
            {answeredCount} of {items.length} answered{minAnswered < items.length ? ` · ${Math.min(minAnswered, items.length)} needed` : ""}
          </span>
          {last ? (
            <Button onClick={doSubmit} disabled={pending || !canSubmit}>
              {pending ? "Submitting…" : submitLabel}
            </Button>
          ) : (
            <Button onClick={() => go(index + 1)}>
              Next <ChevronRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
