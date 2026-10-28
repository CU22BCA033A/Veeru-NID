import { RUBRIC, percent, type Scores } from "@/lib/studio/rubric";

/** Side-by-side rubric: self vs AI vs mentor. */
export function ScoreTable({ self, ai, mentor }: { self: Scores | null; ai: Scores | null; mentor: Scores | null }) {
  const cols = [
    { key: "You", s: self },
    ...(ai ? [{ key: "AI", s: ai }] : []),
    ...(mentor ? [{ key: "GB", s: mentor }] : []),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-3">
            <th className="py-2 font-medium">Criterion</th>
            {cols.map((c) => <th key={c.key} className="py-2 text-right font-medium">{c.key}</th>)}
          </tr>
        </thead>
        <tbody>
          {RUBRIC.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-2">{r.label}</td>
              {cols.map((c) => <td key={c.key} className="py-2 text-right tabular-nums">{c.s?.[r.id] ?? "–"}<span className="text-ink-3">/{r.max}</span></td>)}
            </tr>
          ))}
          <tr className="border-t-2 border-ink font-medium">
            <td className="py-2">Total</td>
            {cols.map((c) => <td key={c.key} className="py-2 text-right tabular-nums">{percent(c.s) ?? "–"}%</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
