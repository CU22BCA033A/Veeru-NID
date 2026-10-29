import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Clock, MessageSquareQuote, Sparkles, Target } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ScoreTable } from "@/components/studio/score-table";
import { requireViewer } from "@/lib/auth";
import type { Critique } from "@/lib/ai/critique";
import { signedSheetUrls } from "@/lib/data/sheets";
import type { Scores } from "@/lib/studio/rubric";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const db = await supabaseServer();
  const { data: s } = await db.from("studio_submissions").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const { data: task } = s.task_id ? await db.from("studio_tasks").select("title,brief,examiner_checklist,minutes").eq("id", s.task_id).maybeSingle() : { data: null };
  const urls = await signedSheetUrls(db, s.image_paths as string[]);
  const ai = s.ai_scores as (Scores & { critique?: Critique }) | null;
  const mentor = s.mentor_scores as Scores | null;
  const checklist = (s.checklist ?? {}) as Record<string, boolean>;
  return (
    <div className="space-y-5">
      <PageHeader title={(task?.title as string) ?? "Studio work"} kicker="Feedback" back={{ href: viewer.role === "mentor" ? "/admin/review" : "/studio", label: viewer.role === "mentor" ? "Review queue" : "Studio" }} />

      <Card className="flex items-center justify-between">
        <div>
          <CardLabel>Score</CardLabel>
          <p className="font-serif text-5xl tabular-nums">{s.final_score ?? "–"}<span className="text-xl text-ink-3">%</span></p>
          <p className="text-xs text-ink-2">{mentor ? "GB's score" : ai ? "AI estimate (GB's marks will replace it)" : "Waiting for GB's marks"}</p>
        </div>
        <div className="text-right text-sm text-ink-2">
          <p className="flex items-center justify-end gap-1"><Clock className="size-4" aria-hidden />{Math.round((s.time_used_s ?? 0) / 60)} / {Math.round((s.time_limit_s ?? 0) / 60)} min</p>
          {s.hints_used ? <p>{s.hints_used} hint{s.hints_used > 1 ? "s" : ""} used</p> : null}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(s.image_paths as string[]).map((p, i) =>
          urls.get(p) ? (
            <a key={p} href={urls.get(p)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls.get(p)} alt={`Sheet ${i + 1}`} className="w-full" />
            </a>
          ) : null,
        )}
      </div>

      {s.mentor_comment && (
        <Card className="border-accent bg-accent-soft">
          <CardLabel className="flex items-center gap-1 text-accent"><MessageSquareQuote className="size-3.5" aria-hidden />GB says</CardLabel>
          <p className="mt-2 whitespace-pre-line leading-relaxed">{s.mentor_comment as string}</p>
        </Card>
      )}

      {ai?.critique && (
        <Card>
          <CardLabel className="flex items-center gap-1"><Sparkles className="size-3.5" aria-hidden />AI examiner</CardLabel>
          <p className="mt-2 text-sm leading-relaxed">{ai.critique.summary}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-good">Strengths</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{ai.critique.strengths.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-warn">Improve</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{ai.critique.improvements.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm"><Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /><span><span className="font-medium">Drill for next time:</span> {ai.critique.drill}</span></p>
        </Card>
      )}

      <Card>
        <CardLabel className="mb-2">Rubric</CardLabel>
        {mentor || ai ? <ScoreTable ai={ai} mentor={mentor} /> : <p className="text-sm text-ink-3">Waiting for GB&apos;s review. His marks for each criterion will appear here.</p>}
      </Card>

      {task && (task.examiner_checklist as string[]).length > 0 && (
        <Card>
          <CardLabel>Your checklist before submitting</CardLabel>
          <ul className="mt-2 space-y-2 text-sm">
            {(task.examiner_checklist as string[]).map((c) => (
              <li key={c} className="flex items-start gap-2">
                {checklist[c] ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" aria-label="ticked" /> : <Circle className="mt-0.5 size-4 shrink-0 text-ink-3" aria-label="not ticked" />}
                {c}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {viewer.role === "student" && <ButtonLink href="/" variant="secondary" className="w-full">Back to today</ButtonLink>}
    </div>
  );
}
