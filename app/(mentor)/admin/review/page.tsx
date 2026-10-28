import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ReviewQueue({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const db = await supabaseServer();
  let q = db.from("studio_submissions").select("id,image_paths,created_at,self_scores,final_score,context,reviewed_at,studio_tasks(title,category)").neq("context", "mock").order("created_at", { ascending: false }).limit(100);
  if (show !== "all") q = q.is("reviewed_at", null);
  const { data } = await q;
  type Row = { id: string; image_paths: string[]; created_at: string; final_score: number | null; context: string; reviewed_at: string | null; studio_tasks: { title: string; category: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  const urls = await signedSheetUrls(db, rows.map((r) => r.image_paths[0]!).filter(Boolean));
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <div>
      <PageHeader title="Review queue" kicker={show === "all" ? "All submissions" : `${rows.length} waiting`}>
        Score Veeru&apos;s sheets on the same rubric he used. Your score overrides his self-score and the AI.
        <Link href={show === "all" ? "/admin/review" : "/admin/review?show=all"} className="ml-2 text-accent underline">{show === "all" ? "Only unreviewed" : "Show all"}</Link>
        <Link href="/admin/mocks" className="ml-3 text-accent underline">Mock papers</Link>
        <Link href="/admin/interview" className="ml-3 text-accent underline">Interview recordings</Link>
      </PageHeader>
      {!rows.length ? (
        <Empty title="Nothing to review">New studio uploads will appear here.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/review/${r.id}`} className="overflow-hidden rounded-2xl border border-line bg-surface hover:border-ink-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {urls.get(r.image_paths[0]!) ? <img src={urls.get(r.image_paths[0]!)} alt="" className="aspect-[4/3] w-full object-cover object-top" loading="lazy" /> : <div className="aspect-[4/3] bg-surface-2" />}
              <div className="space-y-1 p-3">
                <p className="text-sm font-medium">{r.studio_tasks?.title ?? "Studio work"}</p>
                <p className="text-xs text-ink-3">{fmt.format(new Date(r.created_at))} · {r.image_paths.length} page{r.image_paths.length > 1 ? "s" : ""}</p>
                <div className="flex gap-1">
                  <Badge>{r.studio_tasks?.category ?? r.context}</Badge>
                  {r.reviewed_at ? <Badge tone="good">Reviewed · {r.final_score}%</Badge> : <Badge tone="warn">Self {r.final_score ?? "–"}%</Badge>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
