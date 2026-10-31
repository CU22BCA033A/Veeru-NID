import taxonomy from "@/content/taxonomy.json";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Runner } from "@/components/runner/runner";
import { requireViewer } from "@/lib/auth";
import { fetchAll } from "@/lib/data/fetch";
import { getItems, toClientItems } from "@/lib/data/items";
import { supabaseServer } from "@/lib/supabase/server";
import { submitRun } from "../actions";

/**
 * With ?subtopic: "Fix now", 10 fresh questions on that one topic (topped up with past mistakes as review).
 * Without: "Mixed practice", 10 questions from different categories and puzzle types.
 */
export default async function DrillPage({ searchParams }: { searchParams: Promise<{ subtopic?: string }> }) {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { subtopic: asked } = await searchParams;
  const names = new Map(taxonomy.categories.flatMap((c) => c.subtopics.map((s) => [s.id, s.name] as [string, string])));
  const focused = Boolean(asked && names.has(asked));
  const allSubs = [...names.keys()];
  const subtopics = focused ? [asked!] : allSubs;

  const [served, { data: ready }] = await Promise.all([
    fetchAll<{ item_id: string }>(() => db.from("served_items").select("item_id").eq("user_id", viewer.id).order("item_id")),
    db.from("images").select("id").eq("status", "ready"),
  ]);
  const servedSet = new Set(served.map((s) => s.item_id));
  const readySet = new Set((ready ?? []).map((r) => r.id as string));
  const cands = focused
    ? (await db.from("items").select("id,image_ids,category_id,generator,subtopic_id").eq("status", "live").eq("subtopic_id", asked!).neq("type", "short").limit(400)).data ?? []
    : await fetchAll<{ id: string; image_ids: string[]; category_id: string; generator: string | null; subtopic_id: string }>(() => db.from("items").select("id,image_ids,category_id,generator,subtopic_id").eq("status", "live").neq("type", "short").order("id"));
  const fresh = cands.filter((c) => !servedSet.has(c.id as string) && (c.image_ids as string[]).every((i) => readySet.has(i))).sort(() => Math.random() - 0.5);
  let ids: string[];
  if (focused) ids = fresh.slice(0, 10).map((c) => c.id as string);
  else {
    // One from each category in turn, never two of the same puzzle type, at most one mirror/water image.
    const byCat = new Map<string, typeof fresh>();
    for (const c of fresh) byCat.set(c.category_id as string, [...(byCat.get(c.category_id as string) ?? []), c]);
    const kinds = new Set<string>();
    ids = [];
    while (ids.length < 10 && [...byCat.values()].some((l) => l.length)) {
      for (const l of [...byCat.values()].sort(() => Math.random() - 0.5)) {
        if (ids.length >= 10) break;
        const i = l.findIndex((c) => { const k = (c.generator ?? c.subtopic_id) as string; return !kinds.has(k) && !((k === "mirror-image" || k === "water-image") && (kinds.has("mirror-image") || kinds.has("water-image"))); });
        if (i < 0) { l.length = 0; continue; }
        const [c] = l.splice(i, 1);
        kinds.add((c!.generator ?? c!.subtopic_id) as string);
        ids.push(c!.id as string);
      }
    }
  }
  const reviewIds = new Set<string>();
  if (focused && ids.length < 10) {
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
  const title = focused ? names.get(asked!)! : "All categories";

  return (
    <div>
      <PageHeader title={focused ? "Fix-now drill" : "Mixed practice"} kicker={title} back={{ href: focused ? "/learn" : "/", label: focused ? "Learn" : "Today" }} />
      {items.length ? (
        <Runner storageKey={`drill:${ids.join(",").slice(0, 120)}`} items={items} context="drill" planId={null} minAnswered={items.length} submit={submitRun} doneHref="/drill/done" title="Drill" submitLabel="Finish drill" />
      ) : (
        <Empty title="Nothing left to drill here">You&apos;ve seen every question on this topic. Try another one from Learn.</Empty>
      )}
    </div>
  );
}
