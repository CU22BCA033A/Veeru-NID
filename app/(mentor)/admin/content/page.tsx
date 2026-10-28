import Link from "next/link";
import taxonomy from "@/content/taxonomy.json";
import { Badge } from "@/components/ui/badge";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { supabaseServer } from "@/lib/supabase/server";
import { ImportForm } from "./import-form";
import { DismissButton } from "./dismiss-button";

const TABS = [
  { id: "items", label: "Questions" },
  { id: "reports", label: "Reports" },
  { id: "review", label: "Facts to verify" },
  { id: "import", label: "Import PYQs" },
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; cat?: string; source?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "items";
  const db = await supabaseServer();
  const [{ count: live }, { count: generated }, { count: pyq }, { count: tasks }, { count: tips }, { count: cards }] = await Promise.all([
    db.from("items").select("*", { count: "exact", head: true }).eq("status", "live"),
    db.from("items").select("*", { count: "exact", head: true }).eq("source", "Generated"),
    db.from("items").select("*", { count: "exact", head: true }).eq("source", "PYQ"),
    db.from("studio_tasks").select("*", { count: "exact", head: true }),
    db.from("tips").select("*", { count: "exact", head: true }),
    db.from("concept_cards").select("*", { count: "exact", head: true }),
  ]);

  let list: { id: string; stem: string; source: string; subtopic_id: string; status: string; needs_review: boolean }[] = [];
  if (tab === "items" || tab === "review") {
    let q = db.from("items").select("id,stem,source,subtopic_id,status,needs_review").order("id").limit(80);
    if (tab === "review") q = q.eq("needs_review", true);
    if (sp.q) q = q.ilike("stem", `%${sp.q}%`);
    if (sp.cat) q = q.eq("category_id", sp.cat);
    if (sp.source) q = q.eq("source", sp.source);
    else if (tab === "items") q = q.neq("source", "Generated");
    list = ((await q).data ?? []) as typeof list;
  }
  const { data: reports } = tab === "reports" ? await db.from("item_reports").select("id,item_id,reason,created_at,items(stem)").eq("status", "open").order("created_at", { ascending: false }) : { data: [] };

  return (
    <div className="space-y-5">
      <PageHeader title="Content" kicker="Question bank">
        {live} live questions ({generated} generated puzzles, {pyq} PYQs) · {tasks} studio tasks · {tips} tips · {cards} concept cards
      </PageHeader>
      <nav className="flex gap-2 overflow-x-auto" aria-label="Content sections">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/content?tab=${t.id}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${tab === t.id ? "border-ink bg-ink text-paper" : "border-line"}`}>{t.label}</Link>
        ))}
      </nav>

      {(tab === "items" || tab === "review") && (
        <>
          <form className="flex flex-wrap gap-2" action="/admin/content">
            <input type="hidden" name="tab" value={tab} />
            <label className="sr-only" htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Search question text" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
            <select name="cat" defaultValue={sp.cat ?? ""} aria-label="Category" className="min-h-11 rounded-xl border border-line bg-surface px-2">
              <option value="">All categories</option>
              {taxonomy.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="source" defaultValue={sp.source ?? ""} aria-label="Source" className="min-h-11 rounded-xl border border-line bg-surface px-2">
              <option value="">Authored</option>
              {["PYQ", "PYQ-style", "Expected-2027", "Practice", "Generated"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="min-h-11 rounded-xl bg-ink px-4 text-paper">Filter</button>
          </form>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {list.map((i) => (
              <li key={i.id}>
                <Link href={`/admin/content/${i.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="flex-1">
                    <span className="line-clamp-2 text-sm">{i.stem}</span>
                    <span className="text-xs text-ink-3">{i.id} · {i.subtopic_id}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Badge>{i.source}</Badge>
                    {i.status !== "live" && <Badge tone="bad">{i.status}</Badge>}
                    {i.needs_review && <Badge tone="warn">verify</Badge>}
                  </span>
                </Link>
              </li>
            ))}
            {!list.length && <li className="p-4 text-sm text-ink-3">Nothing here.</li>}
          </ul>
        </>
      )}

      {tab === "reports" && (
        <ul className="space-y-3">
          {(reports ?? []).map((r) => (
            <li key={r.id as string}>
              <Card>
                <p className="line-clamp-2 text-sm">{(r.items as unknown as { stem: string })?.stem}</p>
                <p className="mt-2 rounded-lg bg-warn-soft p-2 text-sm">“{r.reason as string}”</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/admin/content/${r.item_id}`} className="min-h-10 rounded-xl bg-ink px-4 py-2 text-sm text-paper">Fix question</Link>
                  <DismissButton id={r.id as string} />
                </div>
              </Card>
            </li>
          ))}
          {!reports?.length && <p className="text-sm text-ink-3">No open reports.</p>}
        </ul>
      )}

      {tab === "import" && (
        <Card>
          <CardLabel className="mb-3">Import previous-year questions</CardLabel>
          <ImportForm />
        </Card>
      )}
    </div>
  );
}
