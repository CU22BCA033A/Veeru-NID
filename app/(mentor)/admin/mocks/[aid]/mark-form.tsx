"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveMockMarks } from "../actions";

export function MarkForm({ attemptId, questions, initialMarks, initialComments, selfMarks }: {
  attemptId: string;
  questions: { no: number; title: string; marks: number }[];
  initialMarks: Record<string, number>;
  initialComments: Record<string, string>;
  selfMarks: Record<string, number>;
}) {
  const [marks, setMarks] = useState<Record<string, number>>(initialMarks);
  const [comments, setComments] = useState<Record<string, string>>(initialComments);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <fieldset key={q.no} className="rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-medium">Q{q.no} {q.title}</legend>
          <label className="flex items-center gap-3 text-sm">
            Marks
            <input type="number" min={0} max={q.marks} step={0.5} value={marks[q.no] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [q.no]: Number(e.target.value) }))} className="min-h-10 w-20 rounded-lg border border-line bg-surface px-2" />
            <span className="text-ink-3">/ {q.marks} · self {selfMarks[q.no] ?? "–"}</span>
          </label>
          <textarea value={comments[q.no] ?? ""} onChange={(e) => setComments((c) => ({ ...c, [q.no]: e.target.value }))} rows={2} placeholder="Comment for Veeru" aria-label={`Comment for question ${q.no}`} className="mt-2 block w-full rounded-lg border border-line bg-surface p-2 text-sm" />
        </fieldset>
      ))}
      {msg && <p role="status" className="text-sm text-ink-2">{msg}</p>}
      <Button disabled={pending} onClick={() => start(async () => { const r = await saveMockMarks({ attemptId, marks, comments }); setMsg(r.error ?? "Saved ✓"); })}>{pending ? "Saving…" : "Save marks"}</Button>
    </div>
  );
}
