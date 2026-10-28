import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StudioSession } from "@/components/studio/session";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function StudioTaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ plan?: string; ctx?: string }> }) {
  const { id } = await params;
  const { plan, ctx } = await searchParams;
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data: t } = await db.from("studio_tasks").select("id,kind,title,brief,minutes,sheet,materials,hints,examiner_checklist,category,source").eq("id", id).maybeSingle();
  if (!t) notFound();
  let planId: string | null = null;
  let back = { href: "/studio", label: "Studio" };
  if (plan && /^[0-9a-f-]{36}$/.test(plan)) {
    const { data: p } = await db.from("daily_plans").select("id,day_no").eq("id", plan).eq("user_id", viewer.id).maybeSingle();
    if (p) {
      planId = p.id as string;
      back = ctx === "test" ? { href: `/day/${p.day_no}/test`, label: `Day ${p.day_no} test` } : { href: "/", label: "Today" };
    }
  }
  const { data: prev } = await db.from("studio_submissions").select("id").eq("user_id", viewer.id).eq("task_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const context = t.kind === "mains" ? "mains" : ctx === "test" ? "test" : "daily";
  return (
    <div>
      <PageHeader title={t.title as string} kicker="Studio task" back={back}>
        {prev && <a href={`/studio/submission/${prev.id}`} className="text-sm text-accent underline">You already submitted this. See feedback →</a>}
      </PageHeader>
      <StudioSession
        task={{
          id: t.id as string, title: t.title as string, brief: t.brief as string, minutes: t.minutes as number, sheet: t.sheet as string,
          materials: t.materials as string[], hints: t.hints as string[], checklist: t.examiner_checklist as string[], category: t.category as string, source: t.source as string,
        }}
        viewerId={viewer.id}
        planId={planId}
        ctx={context}
      />
    </div>
  );
}
