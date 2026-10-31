import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Runner } from "@/components/runner/runner";
import { openDay } from "@/lib/data/day-guard";
import { getItems, toClientItems } from "@/lib/data/items";
import { submitRun } from "../../../../actions";

export default async function QuestionsPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const { db, plan, progress } = await openDay(n);
  if (plan.mock_id) redirect(`/mocks/${plan.mock_id}`);
  if (progress.testItemsDone > 0) redirect(`/day/${plan.day_no}/result`);
  const items = await toClientItems(db, await getItems(db, plan.item_ids), new Set(plan.review_item_ids ?? []));
  const needed = Math.max(1, progress.required - plan.studio_task_ids.length);
  return (
    <div>
      <PageHeader title="Daily test · Part A" kicker={`Day ${plan.day_no}`} back={{ href: `/day/${plan.day_no}/test`, label: "Test overview" }} />
      <Runner
        storageKey={`daily:${plan.id}`}
        items={items}
        context="daily"
        planId={plan.id}
        minAnswered={needed}
        submit={submitRun}
        doneHref={`/day/${plan.day_no}/result`}
        title={`Day ${plan.day_no} test`}
      />
    </div>
  );
}
