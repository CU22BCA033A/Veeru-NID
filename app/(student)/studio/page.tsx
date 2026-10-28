import Link from "next/link";
import { CheckCircle2, Images, Pencil, PenTool, Timer } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { requireViewer } from "@/lib/auth";
import { todayContext } from "@/lib/data/today";
import { supabaseServer } from "@/lib/supabase/server";

export default async function StudioHome({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const viewer = await requireViewer("student");
  const { cat } = await searchParams;
  const db = await supabaseServer();
  const ctx = await todayContext(db, viewer.id);
  const todayIds = ctx.plan ? [...ctx.plan.studio_task_ids, ...(ctx.plan.daily_task_id ? [ctx.plan.daily_task_id] : [])] : [];
  const [{ data: today }, { data: subs }, { data: library }, { count: sheets }] = await Promise.all([
    todayIds.length ? db.from("studio_tasks").select("id,title,minutes,category,kind").in("id", todayIds) : Promise.resolve({ data: [] }),
    db.from("studio_submissions").select("task_id").eq("user_id", viewer.id),
    db.from("studio_tasks").select("id,title,minutes,category,kind,difficulty,phases").eq("status", "live").order("category").limit(1000),
    db.from("studio_submissions").select("*", { count: "exact", head: true }).eq("user_id", viewer.id),
  ]);
  const done = new Set((subs ?? []).map((s) => s.task_id as string));
  const cats = [...new Set((library ?? []).map((t) => t.category as string))].sort();
  const lib = (library ?? []).filter((t) => (cat ? t.category === cat : true) && !todayIds.includes(t.id as string));

  return (
    <div className="space-y-6">
      <PageHeader title="Studio" kicker={`${sheets ?? 0} sheets so far`}>
        Drawing on paper is what decides NID. Timed tasks, photo upload, honest feedback.
      </PageHeader>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/studio/portfolio" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <Images className="size-5 text-accent" aria-hidden /> <span className="font-medium">Portfolio wall</span>
        </Link>
        <Link href="/studio/sketch" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <Pencil className="size-5 text-accent" aria-hidden /> <span className="font-medium">Sketch log</span>
        </Link>
      </div>

      {(today ?? []).length > 0 && ctx.plan && (
        <section>
          <CardLabel className="mb-2">Today</CardLabel>
          <div className="space-y-3">
            {(today ?? []).map((t) => (
              <Card key={t.id as string} className="p-0">
                <Link href={`/studio/task/${t.id}?plan=${ctx.plan!.id}&ctx=${ctx.plan!.studio_task_ids.includes(t.id as string) ? "test" : "daily"}`} className="flex items-center gap-4 p-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><PenTool className="size-5" aria-hidden /></span>
                  <span className="flex-1">
                    <span className="block font-medium">{t.title as string}</span>
                    <span className="flex items-center gap-1 text-sm text-ink-2"><Timer className="size-3.5" aria-hidden />{t.minutes as number} min · {ctx.plan!.studio_task_ids.includes(t.id as string) ? "part of the daily test" : "studio challenge"}</span>
                  </span>
                  {done.has(t.id as string) && <CheckCircle2 className="size-5 text-good" aria-label="Done" />}
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-serif text-2xl">Extra practice</h2>
        <nav aria-label="Filter by type" className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <Link href="/studio" className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${!cat ? "border-ink bg-ink text-paper" : "border-line"}`}>All</Link>
          {cats.map((c) => (
            <Link key={c} href={`/studio?cat=${encodeURIComponent(c)}`} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${cat === c ? "border-ink bg-ink text-paper" : "border-line"}`}>{c}</Link>
          ))}
        </nav>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {lib.slice(0, 60).map((t) => (
            <li key={t.id as string}>
              <Link href={`/studio/task/${t.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="flex-1">
                  <span className="block text-sm font-medium">{t.title as string}</span>
                  <span className="text-xs text-ink-3">{t.category as string} · {t.minutes as number} min{t.kind === "mains" ? " · Mains" : ""}</span>
                </span>
                {done.has(t.id as string) ? <CheckCircle2 className="size-4 text-good" aria-label="Done" /> : <Badge tone="neutral">{"★".repeat(t.difficulty as number)}</Badge>}
              </Link>
            </li>
          ))}
          {!lib.length && <li className="p-4 text-sm text-ink-3">No tasks here yet.</li>}
        </ul>
      </section>
    </div>
  );
}
