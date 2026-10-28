import { notFound } from "next/navigation";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ScoreTable } from "@/components/studio/score-table";
import { signedSheetUrls } from "@/lib/data/sheets";
import type { Scores } from "@/lib/studio/rubric";
import { supabaseServer } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: s } = await db.from("studio_submissions").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const { data: task } = s.task_id ? await db.from("studio_tasks").select("title,brief,minutes,examiner_checklist").eq("id", s.task_id).maybeSingle() : { data: null };
  const urls = await signedSheetUrls(db, s.image_paths as string[]);
  const { data: next } = await db.from("studio_submissions").select("id").is("reviewed_at", null).neq("id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const checklist = (s.checklist ?? {}) as Record<string, boolean>;
  return (
    <div className="space-y-5">
      <PageHeader title={(task?.title as string) ?? "Studio work"} kicker="Review" back={{ href: "/admin/review", label: "Queue" }}>
        {Math.round((s.time_used_s ?? 0) / 60)} of {Math.round((s.time_limit_s ?? 0) / 60)} min used · {s.hints_used ?? 0} hints
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {(s.image_paths as string[]).map((p, i) => urls.get(p) && (
            <a key={p} href={urls.get(p)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls.get(p)} alt={`Sheet ${i + 1}`} className="w-full rounded-xl border border-line" />
            </a>
          ))}
        </div>
        <div className="space-y-4">
          {task && (
            <Card>
              <CardLabel>Brief</CardLabel>
              <p className="mt-1 whitespace-pre-line text-sm">{task.brief as string}</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-2">
                {(task.examiner_checklist as string[]).map((c) => <li key={c}>{checklist[c] ? "☑" : "☐"} {c}</li>)}
              </ul>
            </Card>
          )}
          <Card>
            <CardLabel className="mb-2">Scores so far</CardLabel>
            <ScoreTable self={s.self_scores as Scores} ai={s.ai_scores as Scores | null} mentor={s.mentor_scores as Scores | null} />
          </Card>
          <Card>
            <CardLabel className="mb-3">Your review</CardLabel>
            <ReviewForm id={id} initial={(s.mentor_scores as Scores | null) ?? {}} comment={(s.mentor_comment as string) ?? ""} nextHref={next ? `/admin/review/${next.id}` : null} />
          </Card>
        </div>
      </div>
    </div>
  );
}
