import Link from "next/link";
import { CheckCircle2, Circle, ListChecks, PenTool, Timer } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { HomeworkGate } from "@/components/home/homework-gate";
import { openDay } from "@/lib/data/day-guard";

export default async function TestOverview({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const { db, plan, progress, viewer } = await openDay(n);
  const [{ data: tasks }, { count: earlierHomework }] = await Promise.all([
    plan.studio_task_ids.length ? db.from("studio_tasks").select("id,title,minutes,category").in("id", plan.studio_task_ids) : Promise.resolve({ data: [] }),
    db.from("homework").select("*", { count: "exact", head: true }).eq("user_id", viewer.id).eq("status", "pending").lt("day_no", plan.day_no),
  ]);
  const questionsDone = progress.testItemsDone > 0;

  if (plan.mock_id) {
    return (
      <div>
        <PageHeader title="Mock day" kicker={`Day ${plan.day_no}`} back={{ href: "/", label: "Today" }}>
          Today&apos;s test is a full mock in the real exam format.
        </PageHeader>
        <ButtonLink href={`/mocks/${plan.mock_id}`}>Open the mock</ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Daily test" kicker={`Day ${plan.day_no}${plan.tough_day ? " · tough-day mode" : ""}`} back={{ href: "/", label: "Today" }}>
        Attempt at least {progress.required} items to close the day. Questions first, then the drawing tasks on paper.
      </PageHeader>

      {!questionsDone && (earlierHomework ?? 0) > 0 && <HomeworkGate count={earlierHomework ?? 0} />}

      <Card>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Progress</span>
          <span className="tabular-nums">
            {progress.attempted}/{progress.required} items
          </span>
        </div>
        <ProgressBar value={progress.attempted} max={progress.required} label="Items attempted" className="mt-2" tone={progress.attempted >= progress.required ? "good" : "accent"} />
      </Card>

      <Card className="p-0">
        <Link href={questionsDone ? `/day/${plan.day_no}/result` : `/day/${plan.day_no}/test/questions`} className="flex items-center gap-4 p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <ListChecks className="size-6" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-medium">Part A · Questions</span>
            <span className="text-sm text-ink-2">
              {plan.item_ids.length} quick and short-answer items · about {Math.round(plan.item_ids.length * 1.4)} min
            </span>
          </span>
          {questionsDone ? <CheckCircle2 className="size-6 text-good" aria-label="Done" /> : <Circle className="size-6 text-ink-3" aria-label="Not started" />}
        </Link>
      </Card>

      <section>
        <CardLabel className="mb-2">Part B · Studio tasks (on paper)</CardLabel>
        <div className="space-y-3">
          {(tasks ?? []).map((t) => {
            const done = progress.studioDone.includes(t.id as string);
            return (
              <Card key={t.id as string} className="p-0">
                <Link href={`/studio/task/${t.id}?plan=${plan.id}&ctx=test`} className="flex items-center gap-4 p-5">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
                    <PenTool className="size-6" aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{t.title as string}</span>
                    <span className="flex items-center gap-1 text-sm text-ink-2">
                      <Timer className="size-3.5" aria-hidden /> {t.minutes as number} min · photo upload
                    </span>
                  </span>
                  {done ? <CheckCircle2 className="size-6 text-good" aria-label="Done" /> : <Circle className="size-6 text-ink-3" aria-label="Not started" />}
                </Link>
              </Card>
            );
          })}
          {!tasks?.length && <p className="text-sm text-ink-3">No studio tasks today.</p>}
        </div>
      </section>

      {questionsDone && (
        <ButtonLink href={`/day/${plan.day_no}/result`} variant="secondary" className="w-full">
          See results & explanations
        </ButtonLink>
      )}
    </div>
  );
}
