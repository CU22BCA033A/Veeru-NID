"use client";
import { useState, useTransition } from "react";
import { Clock, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { saveMockMarks } from "../actions";

export interface MarkQuestion {
  no: number;
  title: string;
  prompt: string;
  parts: { label: string; prompt: string; marks: number }[];
  marks: number;
  suggestedMinutes: number;
  usedMinutes: number;
  sheets: string[];
  idealApproach: string | null;
}

/** One block per question: the question, Veeru's sheets, then GB's marks and comment. */
export function MarkForm({ attemptId, questions, initialMarks, initialComments }: {
  attemptId: string;
  questions: MarkQuestion[];
  initialMarks: Record<string, number>;
  initialComments: Record<string, string>;
}) {
  const [marks, setMarks] = useState<Record<string, number>>(initialMarks);
  const [comments, setComments] = useState<Record<string, string>>(initialComments);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const marked = questions.filter((q) => typeof marks[q.no] === "number").length;
  const total = questions.reduce((s, q) => s + (marks[q.no] ?? 0), 0);

  return (
    <div className="space-y-5">
      {questions.map((q) => (
        <Card key={q.no} className="space-y-4">
          <div>
            <CardLabel>Question {q.no} · {q.marks} marks</CardLabel>
            <h2 className="font-serif text-2xl leading-tight">{q.title}</h2>
            <p className="mt-2 leading-relaxed">{q.prompt}</p>
            {q.parts.length > 0 && (
              <ol className="mt-2 space-y-1.5">
                {q.parts.map((p) => (
                  <li key={p.label} className="flex gap-2 text-sm leading-relaxed">
                    <span className="font-semibold">({p.label})</span>
                    <span className="flex-1">{p.prompt}</span>
                    <span className="shrink-0 tabular-nums text-ink-2">{p.marks} {p.marks === 1 ? "mark" : "marks"}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className={`mt-2 flex items-center gap-1 text-xs ${q.usedMinutes > q.suggestedMinutes * 1.2 ? "text-bad" : "text-ink-3"}`}>
              <Clock className="size-3.5" aria-hidden /> Veeru took {q.usedMinutes} min · suggested {q.suggestedMinutes} min
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Veeru&apos;s answer{q.sheets.length > 1 ? ` (${q.sheets.length} sheets)` : ""}</p>
            {q.sheets.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {q.sheets.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Question ${q.no}, sheet ${i + 1}`} className="w-full" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">No sheet uploaded for this question.</p>
            )}
            {q.sheets.length > 0 && <p className="mt-1 text-xs text-ink-3">Tap a sheet to open it full size.</p>}
          </div>

          {q.idealApproach && (
            <details className="rounded-xl bg-surface-2 p-3 text-sm">
              <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 font-medium"><Lightbulb className="size-4 text-accent" aria-hidden />What a strong answer does</summary>
              <p className="mt-2 leading-relaxed">{q.idealApproach}</p>
            </details>
          )}

          <fieldset className="rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-medium">Your marks for Q{q.no}</legend>
            <label className="flex items-center gap-3 text-sm">
              Marks
              <input
                type="number" inputMode="decimal" min={0} max={q.marks} step={0.5}
                value={marks[q.no] ?? ""}
                onChange={(e) => setMarks((m) => {
                  const next = { ...m };
                  if (e.target.value === "") delete next[q.no];
                  else next[q.no] = Math.max(0, Math.min(q.marks, Number(e.target.value)));
                  return next;
                })}
                aria-label={`Marks for question ${q.no}`}
                className="min-h-11 w-24 rounded-lg border border-line bg-surface px-2 text-base"
              />
              <span className="text-ink-3">/ {q.marks}</span>
            </label>
            <textarea
              value={comments[q.no] ?? ""}
              onChange={(e) => setComments((c) => ({ ...c, [q.no]: e.target.value }))}
              rows={3}
              placeholder="Comment for Veeru: what worked, one thing to fix"
              aria-label={`Comment for question ${q.no}`}
              className="mt-2 block w-full rounded-lg border border-line bg-surface p-2 text-sm"
            />
          </fieldset>
        </Card>
      ))}

      <div className="sticky bottom-16 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur md:bottom-4">
        <p className="flex-1 text-sm">
          <span className="font-medium tabular-nums">{total}</span> marks given · {marked} of {questions.length} questions marked
          {msg && <span role="status" className="block text-xs text-ink-2">{msg}</span>}
        </p>
        <Button disabled={pending} onClick={() => start(async () => { const r = await saveMockMarks({ attemptId, marks, comments }); setMsg(r.error ?? "Saved ✓"); })}>
          {pending ? "Saving…" : "Save marks"}
        </Button>
      </div>
    </div>
  );
}
