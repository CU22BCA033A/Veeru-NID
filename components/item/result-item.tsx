"use client";
import { useState, useTransition } from "react";
import { Flag, Lightbulb, NotebookPen } from "lucide-react";
import { ItemView } from "./item-view";
import { SourceBadge } from "./source-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ClientItem } from "@/lib/items/types";
import { reportItem, saveMistakeNote, selfMarkShort } from "@/app/(student)/actions";

export interface ResultData {
  attemptId: string;
  item: ClientItem;
  answer: string | string[] | null;
  correctAnswer: string | string[] | null;
  correct: boolean;
  score: number;
  confidence: "sure" | "guess" | null;
  timeMs: number;
  explanation: string;
  distractors: Record<string, string> | null;
  takeaway: string | null;
  modelAnswer: string | null;
  note: string | null;
  index: number;
}

export function ResultItem({ r }: { r: ResultData }) {
  const [note, setNote] = useState(r.note ?? "");
  const [saved, setSaved] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reported, setReported] = useState(false);
  const [marked, setMarked] = useState<string | null>(null);
  const [, start] = useTransition();
  const chosen = Array.isArray(r.answer) ? r.answer : r.answer ? [r.answer] : [];
  const correct = Array.isArray(r.correctAnswer) ? r.correctAnswer : r.correctAnswer ? [r.correctAnswer] : [];
  const wrongPicks = chosen.filter((c) => !correct.includes(c));
  const status = r.item.type === "short" ? (r.score >= 0.6 ? "good" : "warn") : r.correct ? "good" : "bad";

  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            status === "good" && "bg-good-soft text-good",
            status === "bad" && "bg-bad-soft text-bad",
            status === "warn" && "bg-warn-soft text-warn",
          )}
          aria-label={r.correct ? "Correct" : "Needs work"}
        >
          {r.index}
        </span>
        <span className="line-clamp-2 flex-1 text-sm">{r.item.stem}</span>
        {r.confidence === "guess" && r.correct && <Badge tone="warn">Lucky guess</Badge>}
        <span className="text-xs tabular-nums text-ink-3">{Math.round(r.timeMs / 1000)}s</span>
      </summary>
      <div className="space-y-4 border-t border-line p-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{r.item.categoryName}</Badge>
          <SourceBadge source={r.item.source} />
        </div>
        {r.item.type === "short" ? (
          <>
            <p className="text-lg leading-relaxed">{r.item.stem}</p>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Your answer</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{typeof r.answer === "string" && r.answer ? r.answer : "(no answer)"}</p>
            </div>
            {r.modelAnswer && (
              <div className="rounded-xl bg-good-soft p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-good">A strong answer</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.modelAnswer}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-ink-2">Auto-score {Math.round(r.score * 100)}%. Compare honestly with the strong answer: how much did you cover?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["all", "some", "none"] as const).map((c) => (
                  <Button
                    key={c}
                    variant={marked === c ? "primary" : "secondary"}
                    className="min-h-10"
                    onClick={() => start(async () => { await selfMarkShort(r.attemptId, c); setMarked(c); })}
                  >
                    {c === "all" ? "Covered most of it" : c === "some" ? "Some of it" : "Missed it"}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <ItemView item={r.item} value={r.answer} disabled mark={{ correct, chosen }} />
        )}

        <div className="rounded-xl border-l-4 border-accent bg-accent-soft/50 p-3">
          <p className="text-sm leading-relaxed">{r.explanation}</p>
          {wrongPicks.map((w) =>
            r.distractors?.[w] ? (
              <p key={w} className="mt-2 text-sm leading-relaxed text-ink-2">
                <span className="font-medium uppercase">Why not {w}?</span> {r.distractors[w]}
              </p>
            ) : null,
          )}
          {r.takeaway && (
            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {r.takeaway}
            </p>
          )}
        </div>

        {!r.correct && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => { await saveMistakeNote(r.attemptId, note); setSaved(true); });
            }}
          >
            <label htmlFor={`note-${r.attemptId}`} className="sr-only">Why I got it wrong</label>
            <NotebookPen className="mt-3 size-4 shrink-0 text-ink-3" aria-hidden />
            <input
              id={`note-${r.attemptId}`}
              value={note}
              onChange={(e) => { setNote(e.target.value); setSaved(false); }}
              placeholder="Why I got it wrong (for your mistake notebook)"
              className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
            />
            <Button type="submit" variant="secondary" className="min-h-11" disabled={!note.trim()}>{saved ? "Saved" : "Save"}</Button>
          </form>
        )}

        <div>
          {reported ? (
            <p className="text-xs text-ink-3">Thanks. GB will check this question.</p>
          ) : reporting ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); start(async () => { await reportItem(r.item.id, reportText); setReported(true); }); }}
            >
              <label htmlFor={`rep-${r.attemptId}`} className="sr-only">What's wrong with this question?</label>
              <input id={`rep-${r.attemptId}`} value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="What's wrong or unclear?" className="min-h-10 flex-1 rounded-xl border border-line bg-surface px-3 text-sm" />
              <Button type="submit" variant="secondary" className="min-h-10" disabled={reportText.trim().length < 3}>Send</Button>
            </form>
          ) : (
            <button type="button" onClick={() => setReporting(true)} className="flex min-h-10 items-center gap-1 text-xs text-ink-3 hover:text-ink">
              <Flag className="size-3.5" aria-hidden /> Report this question
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
