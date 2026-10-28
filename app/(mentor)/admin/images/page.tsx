import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireViewer } from "@/lib/auth";
import { loadAuthoredItems, loadImageManifest } from "@/lib/content/load";
import { publicImageUrl } from "@/lib/data/items";
import { supabaseServer } from "@/lib/supabase/server";
import { ImageCard, type ImageRow } from "./image-card";

export default async function ImagesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const viewer = await requireViewer("mentor");
  const { show } = await searchParams;
  const db = await supabaseServer();
  const { data } = await db.from("images").select("id,status,path,license,author,source_url");
  const byId = new Map((data ?? []).map((r) => [r.id as string, r]));
  const manifest = loadImageManifest();
  const items = loadAuthoredItems();
  const rows: (ImageRow & { group: string })[] = manifest.map((m) => {
    const r = byId.get(m.id);
    return {
      id: m.id, group: m.group, description: m.description, shotNotes: m.shotNotes, aspect: m.aspect, openSource: m.openSource ?? null,
      status: (r?.status as "needed" | "ready") ?? "needed", url: r?.path ? publicImageUrl(r.path as string) : null,
      license: (r?.license as string) ?? null, author: (r?.author as string) ?? null, sourceUrl: (r?.source_url as string) ?? null,
      usedBy: items.filter((i) => i.imageIds.includes(m.id)).length,
    };
  });
  const ready = rows.filter((r) => r.status === "ready").length;
  const visible = show === "all" ? rows : rows.filter((r) => r.status !== "ready");
  const groups = [...new Set(visible.map((r) => r.group))];
  return (
    <div>
      <PageHeader title="Photos for questions" kicker="Images">
        Shoot these around home, school and town, or use open-licence photos. Each upload is compressed and unlocks its questions.
      </PageHeader>
      <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
        <div className="flex justify-between text-sm">
          <span>{ready} of {rows.length} photos uploaded</span>
          <a href={show === "all" ? "/admin/images" : "/admin/images?show=all"} className="text-accent underline">
            {show === "all" ? "Show only missing" : "Show all"}
          </a>
        </div>
        <ProgressBar value={ready} max={rows.length} label="Photos uploaded" className="mt-2" tone="good" />
      </div>
      {groups.map((g) => (
        <section key={g} className="mb-8">
          <h2 className="mb-3 font-serif text-2xl">{g}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.filter((r) => r.group === g).map((r) => <ImageCard key={r.id} img={r} mentorName={viewer.displayName} />)}
          </div>
        </section>
      ))}
      {!visible.length && <p className="text-center text-ink-2">All photos are uploaded. 🎉</p>}
    </div>
  );
}
