import Link from "next/link";
import { Award, Flame, Gauge, Pencil, Target } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { AccuracyChart, CategoryRadar, ReadinessChart, RubricBars, SpeedChart } from "@/components/charts/charts";
import { Heatmap } from "@/components/charts/heatmap";
import { cn } from "@/lib/cn";
import type { Analytics } from "@/lib/data/analytics";

function Tile({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon?: typeof Flame; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1 text-xs text-ink-2">{Icon && <Icon className="size-3.5" aria-hidden />}{label}</p>
      <p className="mt-1 font-serif text-3xl tabular-nums">{value}</p>
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </Card>
  );
}

export function ProgressView({ a, student = true }: { a: Analytics; student?: boolean }) {
  const hasDaily = a.accuracyTrend.some((t) => t.accuracy !== null);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Streak" value={a.streak} icon={Flame} hint="days in a row" />
        <Tile label="Sketch streak" value={a.sketchStreak} icon={Pencil} hint="days" />
        <Tile label="Questions solved" value={a.itemsSolved.toLocaleString("en-IN")} />
        <Tile label="Studio sheets" value={a.studioSheets} />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardLabel className="flex items-center gap-1"><Gauge className="size-3.5" aria-hidden />Readiness</CardLabel>
            <p className="font-serif text-5xl tabular-nums">{a.readiness ?? "–"}<span className="text-xl text-ink-3">/100</span></p>
            <p className="text-xs text-ink-2">Target {a.target} · from mocks, studio scores, accuracy and consistency</p>
          </div>
          <p className="text-right text-sm text-ink-2">{a.mocksDone} mock{a.mocksDone === 1 ? "" : "s"} done<br />{a.daysCompleted} days completed</p>
        </div>
        {a.readinessSeries.length > 1 && <div className="mt-3"><ReadinessChart data={a.readinessSeries} target={a.target} /></div>}
      </Card>

      {a.weakest.length > 0 && (
        <Card className="border-accent">
          <CardLabel className="flex items-center gap-1 text-accent"><Target className="size-3.5" aria-hidden />Weakest topics</CardLabel>
          <ul className="mt-2 space-y-2">
            {a.weakest.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3">
                <span>{w.name}</span>
                {student ? <Link href={`/drill?subtopic=${w.id}`} className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-ink">Fix now</Link> : <span className="text-sm text-ink-3">skill {w.rating}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardLabel className="mb-3">100-day calendar</CardLabel>
        <Heatmap days={a.heatmap} />
      </Card>

      <Card>
        <CardLabel className="mb-2">Daily-test accuracy (last 30 days)</CardLabel>
        {hasDaily ? <AccuracyChart data={a.accuracyTrend} /> : <p className="text-sm text-ink-3">Complete a daily test to see your trend.</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardLabel className="mb-2">Accuracy by category</CardLabel>
          {a.categoryRadar.length >= 3 ? <CategoryRadar data={a.categoryRadar} /> : <p className="text-sm text-ink-3">Needs a few more days of practice.</p>}
        </Card>
        <Card>
          <CardLabel className="mb-2">Speed: seconds per question</CardLabel>
          {hasDaily ? <SpeedChart data={a.accuracyTrend} /> : <p className="text-sm text-ink-3">No data yet.</p>}
        </Card>
      </div>

      <Card>
        <CardLabel className="mb-2">Drawing rubric: then vs now</CardLabel>
        {a.rubric.some((r) => r.first !== null) ? <RubricBars data={a.rubric} /> : <p className="text-sm text-ink-3">Submit a few studio sheets to see your drawing trend.</p>}
      </Card>

      <Card>
        <CardLabel className="mb-3 flex items-center gap-1"><Award className="size-3.5" aria-hidden />Milestones</CardLabel>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {a.badges.map((b) => (
            <li key={b.id} className={cn("rounded-xl border p-3 text-sm", b.earned ? "border-accent bg-accent-soft" : "border-dashed border-line text-ink-3")}>
              {b.earned ? "★ " : ""}{b.label}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
