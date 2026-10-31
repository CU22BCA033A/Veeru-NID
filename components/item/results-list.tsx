import { CheckCircle2, Target } from "lucide-react";
import { ResultItem, type ResultData } from "./result-item";

const isMistake = (r: ResultData) => (r.item.type === "short" ? r.score < 0.6 : !r.correct);

/** Results with the mistakes first, already open, so the correct answer and the reason are the first thing he reads. */
export function ResultsList({ rows }: { rows: ResultData[] }) {
  const wrong = rows.filter(isMistake);
  const right = rows.filter((r) => !isMistake(r));
  return (
    <div className="space-y-6">
      {wrong.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Target className="size-5 text-bad" aria-hidden /> Your mistakes ({wrong.length}): learn from these
          </h2>
          <p className="text-sm text-ink-2">For each one: what you chose, the correct answer, why it&apos;s correct, and why your choice was wrong.</p>
          {wrong.map((r) => <ResultItem key={r.attemptId} r={r} open />)}
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-good-soft p-4 font-medium text-good">
          <CheckCircle2 className="size-5" aria-hidden /> No mistakes. Excellent work!
        </p>
      )}
      {right.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <CheckCircle2 className="size-5 text-good" aria-hidden /> Got right ({right.length})
          </h2>
          <p className="text-sm text-ink-2">Tap any question to see the explanation.</p>
          {right.map((r) => <ResultItem key={r.attemptId} r={r} />)}
        </section>
      )}
    </div>
  );
}
