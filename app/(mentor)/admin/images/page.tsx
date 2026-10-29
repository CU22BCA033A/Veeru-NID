import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireViewer } from "@/lib/auth";
import { loadAuthoredItems, loadImageManifest } from "@/lib/content/load";
import { publicImageUrl } from "@/lib/data/items";
import { supabaseServer } from "@/lib/supabase/server";
import { ImageCard, type ImageRow } from "./image-card";

export default async function ImagesPage({ searchParams }: { searchParams: Promise<{ show?: string; group?: string }> }) {
  const viewer = await requireViewer("mentor");
  const { show, group } = await searchParams;
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
  // One group at a time: 100+ interactive cards made the page slow to respond on phones.
  const allGroups = [...new Set(rows.map((r) => r.group))];
  const missingIn = (g: string) => rows.filter((r) => r.group === g && r.status !== "ready").length;
  const current = group && allGroups.includes(group) ? group : (allGroups.find((g) => missingIn(g) > 0) ?? allGroups[0]!);
  const visible = rows.filter((r) => r.group === current && (show === "all" || r.status !== "ready"));
  const link = (g: string, all = show === "all") => `/admin/images?group=${encodeURIComponent(g)}${all ? "&show=all" : ""}`;
  return (
    <div>
      <PageHeader title="Photos for questions" kicker="Images">
        Shoot these around home, school and town, or use open-licence photos. Each upload is compressed and unlocks its questions.
      </PageHeader>
      <div className="mb-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex justify-between text-sm">
          <span>{ready} of {rows.length} photos uploaded</span>
          <Link href={link(current, show !== "all")} className="text-accent underline">
            {show === "all" ? "Show only missing" : "Show all"}
          </Link>
        </div>
        <ProgressBar value={ready} max={rows.length} label="Photos uploaded" className="mt-2" tone="good" />
      </div>
      <nav aria-label="Photo groups" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {allGroups.map((g) => {
          const missing = missingIn(g);
          return (
            <Link
              key={g}
              href={link(g)}
              aria-current={g === current ? "page" : undefined}
              className={`flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-3 text-sm ${g === current ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface text-ink-2"}`}
            >
              {g}
              <span className={`rounded-full px-1.5 text-xs ${missing ? "bg-warn-soft text-warn" : "bg-good-soft text-good"}`}>{missing ? missing : "✓"}</span>
            </Link>
          );
        })}
      </nav>
      <section>
        <h2 className="mb-3 font-serif text-2xl">{current}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => <ImageCard key={r.id} img={r} mentorName={viewer.displayName} />)}
        </div>
        {!visible.length && <p className="text-center text-ink-2">All photos in this group are uploaded. 🎉 Pick another group above.</p>}
      </section>
    </div>
  );
}
