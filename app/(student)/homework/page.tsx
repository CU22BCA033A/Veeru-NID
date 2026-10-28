import { CheckCircle2 } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Empty } from "@/components/ui/empty";
import { ButtonLink } from "@/components/ui/button";
import { Runner } from "@/components/runner/runner";
import { requireViewer } from "@/lib/auth";
import { getItems, labels, toClientItems } from "@/lib/data/items";
import { supabaseServer } from "@/lib/supabase/server";
import { submitRun } from "../actions";

export default async function HomeworkPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data: hw } = await db.from("homework").select("id,item_id,kind,day_no").eq("user_id", viewer.id).eq("status", "pending").order("day_no").order("kind").limit(60);
  if (!hw?.length) {
    return (
      <div>
        <PageHeader title="Homework" back={{ href: "/", label: "Today" }} />
        <Empty title="All clear ✓">No homework waiting. Mistakes from your daily test land here automatically, along with spaced-repetition reviews.</Empty>
        <div className="mt-4 text-center"><ButtonLink href="/" variant="secondary">Back to today</ButtonLink></div>
      </div>
    );
  }
  // re-attempts after their fresh variants so the concept card is read first
  const order = [...hw].sort((a, b) => (a.kind === "reattempt" ? 1 : 0) - (b.kind === "reattempt" ? 1 : 0));
  const items = await getItems(db, order.map((h) => h.item_id as string));
  const reviewIds = new Set(order.filter((h) => h.kind !== "variant").map((h) => h.item_id as string));
  const client = await toClientItems(db, items, reviewIds);
  const subs = [...new Set(items.map((i) => i.subtopic_id))];
  const [{ data: cards }, l] = await Promise.all([db.from("concept_cards").select("id,subtopic_id,title,body,svg").in("subtopic_id", subs), labels(db)]);
  const homeworkIds = order.filter((h) => items.some((i) => i.id === h.item_id)).map((h) => h.id as string);

  return (
    <div>
      <PageHeader title="Homework" kicker={`${hw.length} items`} back={{ href: "/", label: "Today" }}>
        Read the concept cards, then try again. Each mistake comes back once, plus 2 new questions on the same idea.
      </PageHeader>
      {(cards ?? []).length > 0 && (
        <section className="mb-6 space-y-3">
          <CardLabel>Concept cards first</CardLabel>
          {(cards ?? []).map((c) => (
            <details key={c.id as string} className="rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer font-medium">
                {c.title as string} <span className="text-xs text-ink-3">· {l.subtopic.get(c.subtopic_id as string)}</span>
              </summary>
              {c.svg && <div className="puzzle-svg mx-auto my-3 max-w-xs" dangerouslySetInnerHTML={{ __html: c.svg as string }} />}
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{c.body as string}</p>
            </details>
          ))}
        </section>
      )}
      <Card className="mb-4 flex items-center gap-2 bg-surface-2 text-sm text-ink-2">
        <CheckCircle2 className="size-4" aria-hidden /> Items marked <span className="font-medium text-warn">Review</span> are earlier questions coming back on purpose.
      </Card>
      <Runner
        storageKey={`homework:${homeworkIds.slice(0, 3).join(",")}:${homeworkIds.length}`}
        items={client}
        context="homework"
        planId={null}
        homeworkIds={homeworkIds}
        minAnswered={client.length}
        submit={submitRun}
        doneHref="/homework/done"
        title="Homework"
        submitLabel="Finish homework"
      />
    </div>
  );
}
