import { Sparkles } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Runner } from "@/components/runner/runner";
import { openDay } from "@/lib/data/day-guard";
import { getItems, toClientItems } from "@/lib/data/items";
import { submitRun } from "../../../actions";

export default async function WarmupPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const { db, plan, progress } = await openDay(n);
  const items = await toClientItems(db, await getItems(db, plan.warmup_item_ids));
  const { data: tip } = plan.tip_id ? await db.from("tips").select("title,body").eq("id", plan.tip_id).maybeSingle() : { data: null };

  if (progress.steps.warmup) {
    return (
      <div>
        <PageHeader title="Warm-up done" kicker={`Day ${plan.day_no}`} back={{ href: "/", label: "Today" }} />
        <ButtonLink href={`/day/${plan.day_no}/test`}>Go to the daily test</ButtonLink>
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Morning warm-up" kicker={`Day ${plan.day_no} · 5 minutes`} back={{ href: "/", label: "Today" }} />
      {tip && (
        <Card className="mb-6 bg-accent-soft">
          <CardLabel className="text-accent">
            <Sparkles className="mr-1 inline size-3.5" aria-hidden /> Tip of the day
          </CardLabel>
          <p className="mt-2 font-medium">{tip.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{tip.body}</p>
        </Card>
      )}
      <Runner
        storageKey={`warmup:${plan.id}`}
        items={items}
        context="warmup"
        planId={plan.id}
        minAnswered={items.length}
        submit={submitRun}
        doneHref="/"
        title="Warm-up"
        submitLabel="Finish warm-up"
      />
    </div>
  );
}
