"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { RUBRIC, type Scores } from "@/lib/studio/rubric";
import { saveReview } from "../actions";

export function ReviewForm({ id, initial, comment: initialComment, nextHref }: { id: string; initial: Scores; comment: string; nextHref: string | null }) {
  const [scores, setScores] = useState<Scores>(initial);
  const [comment, setComment] = useState(initialComment);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-5">
      {RUBRIC.map((c) => (
        <fieldset key={c.id}>
          <legend className="flex w-full justify-between text-sm font-medium">
            <span>{c.label}</span>
            <span className="tabular-nums text-ink-2">{scores[c.id] ?? "–"}/{c.max}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: c.max + 1 }, (_, v) => (
              <button key={v} type="button" aria-pressed={scores[c.id] === v} onClick={() => setScores((x) => ({ ...x, [c.id]: v }))}
                className={cn("size-9 rounded-lg border text-sm tabular-nums", scores[c.id] === v ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}>
                {v}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="block">
        <span className="text-sm font-medium">Comment for Veeru</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={5} placeholder="One thing that worked, one thing to fix, one drill." className="mt-1 block w-full rounded-xl border border-line bg-surface p-3" />
      </label>
      {msg && <p role="status" className="text-sm text-ink-2">{msg}</p>}
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => start(async () => {
          const r = await saveReview({ id, scores, comment });
          if (r.error) setMsg(r.error);
          else if (nextHref) router.push(nextHref);
          else { setMsg("Saved ✓"); router.refresh(); }
        })}>
          {pending ? "Saving…" : nextHref ? "Save & next" : "Save review"}
        </Button>
      </div>
    </div>
  );
}
