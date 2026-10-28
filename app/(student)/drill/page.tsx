import taxonomy from "@/content/taxonomy.json";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Runner } from "@/components/runner/runner";
import { requireViewer } from "@/lib/auth";
import { fetchAll } from "@/lib/data/fetch";
import { getItems, toClientItems } from "@/lib/data/items";
import { weakestSubtopics } from "@/lib/plan/builder";
import { supabaseServer } from "@/lib/supabase/server";
import { submitRun } from "../actions";

/** "Fix now": 10 fresh questions on one subtopic (default: the weakest), else past mistakes as review. */
export default async function DrillPage({ searchParams }: { searchParams: Promise<{ subtopic?: string }> }) {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { subtopic: asked } = await searchParams;
  const { data: ratings } = await db.from("skill_ratings").select("subtopic_id,rating,attempts").eq("user_id", viewer.id);
  const weak = weakestSubtopics(new Map((ratings ?? []).map((r) => [r.subtopic_id as string, { rating: Number(r.rating), attempts: r.attempts as number }])), 3);
  const names = new Map(taxonomy.categories.flatMap((c) => c.subtopics.map((s) => [s.id, s.name] as [string, string])));
  const subtopics = asked && names.has(asked) ? [asked] : weak.length ? weak : ["visual.mirror", "colour.harmony", "drawing.perspective"];

  const [served, { data: ready }] = await Promise.all([
    fetchAll<{ item_id: string }>(() => db.from("served_items").select("item_id").eq("user_id", viewer.id).order("item_id")),
    db.from("images").select("id").eq("status", "ready"),
  ]);
  const servedSet = new Set(served.map((s) => s.item_id));
  const readySet = new Set((ready ?? []).map((r) => r.id as string));
  const { data: cands } = await db.from("items").select("id,image_ids,difficulty").eq("status", "live").in("subtopic_id", subtopics).neq("type", "short").limit(400);
  const fresh = (cands ?? []).filter((c) => !servedSet.has(c.id as string) && (c.image_ids as string[]).every((i) => readySet.has(i)));
  let ids = fresh.sort(() => Math.random() - 0.5).slice(0, 10).map((c) => c.id as string);
  const reviewIds = new Set<string>();
  if (ids.length < 10) {
    // top up with past mistakes in these subtopics, clearly labelled as review
    const { data: wrong } = await db.from("attempts").select("item_id,items!inner(subtopic_id)").eq("user_id", viewer.id).eq("correct", false).in("items.subtopic_id", subtopics).limit(50);
    for (const w of wrong ?? []) {
      if (ids.length >= 10) break;
      if (!ids.includes(w.item_id as string)) { ids.push(w.item_id as string); reviewIds.add(w.item_id as string); }
    }
  }
  const newIds = ids.filter((id) => !reviewIds.has(id));
  if (newIds.length) await db.from("served_items").upsert(newIds.map((id) => ({ user_id: viewer.id, item_id: id, context: "drill" })), { onConflict: "user_id,item_id", ignoreDuplicates: true });
  const items = await toClientItems(db, await getItems(db, ids), reviewIds);
  const title = subtopics.map((s) => names.get(s)).join(", ");

  return (
    <div>
      <PageHeader title="Fix-now drill" kicker={title} back={{ href: "/learn", label: "Learn" }} />
      {items.length ? (
        <Runner storageKey={`drill:${ids.join(",").slice(0, 120)}`} items={items} context="drill" planId={null} minAnswered={items.length} submit={submitRun} doneHref="/drill/done" title="Drill" submitLabel="Finish drill" />
      ) : (
        <Empty title="Nothing left to drill here">You&apos;ve seen every question on this topic. Try another one from Learn.</Empty>
      )}
    </div>
  );
}
