import Link from "next/link";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ cat?: string; compare?: string }> }) {
  const viewer = await requireViewer("student");
  const { cat, compare } = await searchParams;
  const db = await supabaseServer();
  const { data } = await db
    .from("studio_submissions")
    .select("id,image_paths,final_score,created_at,studio_tasks(title,category)")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: true })
    .limit(500);
  type Row = { id: string; image_paths: string[]; final_score: number | null; created_at: string; studio_tasks: { title: string; category: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  const cats = [...new Set(rows.map((r) => r.studio_tasks?.category).filter(Boolean) as string[])].sort();
  const shown = (cat ? rows.filter((r) => r.studio_tasks?.category === cat) : rows).slice().reverse();
  const urls = await signedSheetUrls(db, shown.slice(0, 60).map((r) => r.image_paths[0]!).filter(Boolean));
  // Day 1 vs today: first and latest in the chosen (or most common) category
  const compareCat = compare ?? cat ?? cats[0];
  const inCat = rows.filter((r) => r.studio_tasks?.category === compareCat);
  const first = inCat[0], latest = inCat.length > 1 ? inCat[inCat.length - 1] : undefined;
  const cmpUrls = await signedSheetUrls(db, [first?.image_paths[0], latest?.image_paths[0]].filter(Boolean) as string[]);
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio wall" kicker={`${rows.length} sheets`} back={{ href: "/studio", label: "Studio" }}>
        Every sheet you&apos;ve drawn, newest first. Watch yourself improve.
      </PageHeader>
      {!rows.length ? (
        <Empty title="Your wall is empty">Finish a studio task and your sheets will appear here.</Empty>
      ) : (
        <>
          {first && latest && (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="font-serif text-xl">Then vs now · {compareCat}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[first, latest].map((r, i) => (
                  <figure key={r.id}>
                    <Link href={`/studio/submission/${r.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {cmpUrls.get(r.image_paths[0]!) && <img src={cmpUrls.get(r.image_paths[0]!)} alt={`${i ? "Latest" : "First"} sheet`} className="aspect-[1/1.414] w-full rounded-xl border border-line object-cover" />}
                    </Link>
                    <figcaption className="mt-1 text-xs text-ink-2">{i ? "Latest" : "First"} · {fmt.format(new Date(r.created_at))}{r.final_score !== null ? ` · ${r.final_score}%` : ""}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          <nav aria-label="Filter by type" className="flex gap-2 overflow-x-auto pb-1">
            <Link href="/studio/portfolio" className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${!cat ? "border-ink bg-ink text-paper" : "border-line"}`}>All</Link>
            {cats.map((c) => (
              <Link key={c} href={`/studio/portfolio?cat=${encodeURIComponent(c)}`} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${cat === c ? "border-ink bg-ink text-paper" : "border-line"}`}>{c}</Link>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.slice(0, 60).map((r) => (
              <Link key={r.id} href={`/studio/submission/${r.id}`} className="group overflow-hidden rounded-xl border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {urls.get(r.image_paths[0]!) ? <img src={urls.get(r.image_paths[0]!)} alt={r.studio_tasks?.title ?? "Sheet"} loading="lazy" className="aspect-[1/1.414] w-full object-cover transition group-hover:opacity-90" /> : <div className="aspect-[1/1.414] bg-surface-2" />}
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-medium">{r.studio_tasks?.title}</p>
                  <p className="text-xs text-ink-3">{fmt.format(new Date(r.created_at))}{r.final_score !== null ? ` · ${r.final_score}%` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
