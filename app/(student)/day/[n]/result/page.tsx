import { redirect } from "next/navigation";
import { ArrowRight, Clock, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ResultItem } from "@/components/item/result-item";
import { MarkSeen } from "@/components/home/mark-seen";
import { openDay } from "@/lib/data/day-guard";
import { resultRows } from "@/lib/data/results";
import { labels } from "@/lib/data/items";

export default async function ResultPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const { db, plan, viewer } = await openDay(n);
  const { data: attempts } = await db
    .from("attempts")
    .select("id,item_id,answer,correct,score,confidence,time_ms,note,created_at")
    .eq("plan_id", plan.id)
    .eq("context", "daily")
    .order("created_at");
  if (!attempts?.length) redirect(`/day/${plan.day_no}/test`);
  const rows = await resultRows(db, attempts as never, plan.item_ids);
  const l = await labels(db);

  const answered = rows.filter((r) => r.answer !== null && r.answer !== "" && !(Array.isArray(r.answer) && !r.answer.length));
  const correct = rows.filter((r) => r.correct).length;
  const accuracy = rows.length ? Math.round((correct / rows.length) * 100) : 0;
  const avgTime = answered.length ? Math.round(answered.reduce((s, r) => s + r.timeMs, 0) / answered.length / 1000) : 0;

  // last 7 days for comparison (excluding this plan)
  const since = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const { data: recent } = await db.from("attempts").select("correct,plan_id").eq("user_id", viewer.id).eq("context", "daily").gte("created_at", since).neq("plan_id", plan.id);
  const avg7 = recent?.length ? Math.round((recent.filter((r) => r.correct).length / recent.length) * 100) : null;

  const byCat = new Map<string, { n: number; c: number }>();
  for (const r of rows) {
    const v = byCat.get(r.item.category) ?? { n: 0, c: 0 };
    byCat.set(r.item.category, { n: v.n + 1, c: v.c + (r.correct ? 1 : 0) });
  }
  const cats = [...byCat.entries()].map(([id, v]) => ({ id, name: l.category.get(id) ?? id, ...v, pct: Math.round((v.c / v.n) * 100) })).sort((a, b) => b.pct - a.pct);
  const best = cats.filter((c) => c.pct >= 70).slice(0, 2);
  const worst = [...cats].reverse().filter((c) => c.pct < 70).slice(0, 2);
  const lucky = rows.filter((r) => r.confidence === "guess" && r.correct).length;
  const { count: hw } = await db.from("homework").select("*", { count: "exact", head: true }).eq("user_id", viewer.id).eq("day_no", plan.day_no).eq("status", "pending");

  return (
    <div className="space-y-5">
      <MarkSeen planId={plan.id} />
      <PageHeader title="Your results" kicker={`Day ${plan.day_no}`} back={{ href: "/", label: "Today" }} />

      <Card className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="font-serif text-4xl tabular-nums">{accuracy}%</p>
          <p className="text-xs text-ink-2">accuracy ({correct}/{rows.length})</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 font-serif text-4xl tabular-nums">{avgTime}<span className="text-lg">s</span></p>
          <p className="flex items-center justify-center gap-1 text-xs text-ink-2"><Clock className="size-3" aria-hidden />per item</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 font-serif text-4xl tabular-nums">
            {avg7 === null ? "—" : `${accuracy - avg7 >= 0 ? "+" : ""}${accuracy - avg7}`}
            {avg7 !== null && (accuracy >= avg7 ? <TrendingUp className="size-5 text-good" aria-hidden /> : <TrendingDown className="size-5 text-bad" aria-hidden />)}
          </p>
          <p className="text-xs text-ink-2">vs 7-day avg{avg7 !== null ? ` (${avg7}%)` : ""}</p>
        </div>
      </Card>

      <Card>
        <CardLabel>By category</CardLabel>
        <ul className="mt-3 space-y-2">
          {cats.map((c) => (
            <li key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
              <span>{c.name}</span>
              <span className="tabular-nums text-ink-2">{c.c}/{c.n}</span>
              <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span className={`block h-full rounded-full ${c.pct >= 70 ? "bg-good" : c.pct >= 40 ? "bg-warn" : "bg-bad"}`} style={{ width: `${c.pct}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-good-soft">
          <CardLabel className="text-good">What went well</CardLabel>
          <p className="mt-2 text-sm">{best.length ? `Strong in ${best.map((b) => b.name).join(" and ")}.` : "You showed up and finished. That's the habit that wins."}</p>
        </Card>
        <Card className="bg-warn-soft">
          <CardLabel className="text-warn">What to fix</CardLabel>
          <p className="mt-2 text-sm">
            {worst.length ? `Focus on ${worst.map((w) => w.name).join(" and ")}.` : "Nothing major. Keep the pace."}
            {lucky ? ` ${lucky} correct answer${lucky > 1 ? "s were" : " was a"} guess${lucky > 1 ? "es" : ""}; ${lucky > 1 ? "they're" : "it's"} in homework too.` : ""}
          </p>
        </Card>
      </div>

      {(hw ?? 0) > 0 && (
        <ButtonLink href="/homework" className="w-full justify-between">
          <span className="flex items-center gap-2"><Target className="size-4" aria-hidden />{hw} homework items ready</span>
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Every question, explained</h2>
        {rows.map((r) => <ResultItem key={r.attemptId} r={r} />)}
      </section>
    </div>
  );
}
