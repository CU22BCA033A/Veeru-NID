import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { labels } from "@/lib/data/items";
import { supabaseServer } from "@/lib/supabase/server";

export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const viewer = await requireViewer("student");
  const { cat } = await searchParams;
  const db = await supabaseServer();
  const { data } = await db
    .from("attempts")
    .select("id,item_id,note,created_at,plan_id,items!inner(stem,category_id,subtopic_id,takeaway),daily_plans(day_no)")
    .eq("user_id", viewer.id)
    .eq("correct", false)
    .in("context", ["daily", "drill", "warmup"])
    .order("created_at", { ascending: false })
    .limit(300);
  const l = await labels(db);
  type Row = { id: string; item_id: string; note: string | null; created_at: string; items: { stem: string; category_id: string; subtopic_id: string; takeaway: string | null }; daily_plans: { day_no: number } | null };
  const rows = (data ?? []) as unknown as Row[];
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.item_id) ? false : (seen.add(r.item_id), true)));
  const cats = [...new Set(unique.map((r) => r.items.category_id))];
  const shown = cat ? unique.filter((r) => r.items.category_id === cat) : unique;

  return (
    <div>
      <PageHeader title="Mistake notebook" kicker={`${unique.length} mistakes`} back={{ href: "/learn", label: "Learn" }}>
        Every wrong answer lands here with your note. Read it before mocks.
      </PageHeader>
      {cats.length > 1 && (
        <nav aria-label="Filter by category" className="mb-4 flex flex-wrap gap-2">
          <Link href="/notebook" className={`rounded-full border px-3 py-1.5 text-sm ${!cat ? "border-ink bg-ink text-paper" : "border-line"}`}>All</Link>
          {cats.map((c) => (
            <Link key={c} href={`/notebook?cat=${c}`} className={`rounded-full border px-3 py-1.5 text-sm ${cat === c ? "border-ink bg-ink text-paper" : "border-line"}`}>{l.category.get(c)}</Link>
          ))}
        </nav>
      )}
      {!shown.length ? (
        <Empty title="No mistakes logged yet">They&apos;ll appear here after your daily tests.</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <Badge>{l.subtopic.get(r.items.subtopic_id)}</Badge>
                {r.daily_plans && <Link href={`/day/${r.daily_plans.day_no}/result`} className="underline">Day {r.daily_plans.day_no}</Link>}
              </div>
              <p className="mt-2 line-clamp-3 text-sm">{r.items.stem}</p>
              {r.note ? <p className="mt-2 rounded-lg bg-warn-soft p-2 text-sm"><span className="font-medium">My note:</span> {r.note}</p> : null}
              {r.items.takeaway && <p className="mt-2 text-sm font-medium text-accent">→ {r.items.takeaway}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
