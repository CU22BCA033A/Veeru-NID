import { notFound } from "next/navigation";
import { Gauge, MessageSquareQuote, RotateCcw } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { getMock, mockScore, type MockAnswers } from "@/lib/data/mocks";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";

export default async function MockResult({ params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  const viewer = await requireViewer();
  const db = await supabaseServer();
  const { data: att } = await db.from("mock_attempts").select("*").eq("id", aid).maybeSingle();
  if (!att || !att.submitted_at) notFound();
  const mock = await getMock(db, att.mock_id as string);
  if (!mock) notFound();
  const answers = att.answers as MockAnswers;
  const score = mockScore(mock, answers);
  const split = (att.time_split ?? {}) as Record<string, number>;
  const { phases } = await loadSettings();
  const urls = await signedSheetUrls(db, Object.values(answers.uploads ?? {}).flat());
  const maxMin = Math.max(...mock.questions.map((q) => Math.max(q.suggestedMinutes, (split[q.no] ?? 0) / 60)), 1);
  return (
    <div className="space-y-5">
      <PageHeader title={mock.title} kicker="Mock result" back={{ href: viewer.role === "mentor" ? "/admin" : "/mocks", label: "Back" }} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardLabel>Score</CardLabel>
          <p className="font-serif text-5xl tabular-nums">{score.total}<span className="text-xl text-ink-3">/{score.reviewed ? mock.total_marks : score.markedMax}</span></p>
          <p className="text-xs text-ink-2">{score.reviewed ? "Marked by GB" : `Marked so far: ${score.markedMax} of ${mock.total_marks} marks. Drawing questions are waiting for GB.`}</p>
        </Card>
        <Card>
          <CardLabel className="flex items-center gap-1"><Gauge className="size-3.5" aria-hidden />Readiness</CardLabel>
          <p className="font-serif text-5xl tabular-nums">{att.readiness ?? "–"}<span className="text-xl text-ink-3">/100</span></p>
          <p className="text-xs text-ink-2">Target {phases.targetReadiness}. Combines mocks, studio scores, accuracy and consistency.</p>
        </Card>
      </div>

      <Card>
        <CardLabel>Where the time went</CardLabel>
        <ul className="mt-3 space-y-3">
          {mock.questions.map((q) => {
            const used = (split[q.no] ?? 0) / 60;
            const over = used > q.suggestedMinutes * 1.2;
            return (
              <li key={q.no} className="text-sm">
                <div className="flex justify-between"><span>Q{q.no} {q.title}</span><span className={over ? "text-bad" : "text-ink-2"}>{Math.round(used)} / {q.suggestedMinutes} min</span></div>
                <div className="relative mt-1 h-2 rounded-full bg-surface-2">
                  <div className={`absolute h-2 rounded-full ${over ? "bg-bad" : "bg-accent"}`} style={{ width: `${(used / maxMin) * 100}%` }} />
                  <div className="absolute top-[-3px] h-3.5 w-0.5 bg-ink" style={{ left: `${(q.suggestedMinutes / maxMin) * 100}%` }} title="Suggested" />
                </div>
              </li>
            );
          })}
        </ul>
        {att.mode === "paper" && <p className="mt-3 text-xs text-ink-3">Paper mode: time per question is only what was tracked on screen.</p>}
      </Card>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Paper analysis</h2>
        {mock.questions.map((q) => {
          const a = mock.analysis.find((x) => x.no === q.no);
          const mark = score.byQuestion[q.no];
          return (
            <Card key={q.no}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Q{q.no}</Badge>
                <span className="font-medium">{q.title}</span>
                <span className="ml-auto tabular-nums text-sm">{mark === null ? <span className="text-ink-3">Waiting for GB · /{q.marks}</span> : `${mark}/${q.marks}`}</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">{q.prompt}</p>
              {(answers.uploads?.[q.no] ?? []).length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {(answers.uploads![q.no] ?? []).map((p) => urls.get(p) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={p} href={urls.get(p)} target="_blank" rel="noreferrer"><img src={urls.get(p)} alt={`Q${q.no} sheet`} className="h-32 rounded-lg border border-line" /></a>
                  ))}
                </div>
              )}
              {answers.mentorComments?.[q.no] && (
                <p className="mt-3 flex gap-2 rounded-xl bg-accent-soft p-3 text-sm"><MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />{answers.mentorComments[q.no]}</p>
              )}
              {a && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm leading-relaxed"><span className="font-medium">Ideal approach: </span>{a.idealApproach}</p>}
            </Card>
          );
        })}
      </section>
      {viewer.role === "student" && (
        <ButtonLink href={`/mocks/${mock.id}`} variant="secondary" className="w-full">
          <RotateCcw className="size-4" aria-hidden /> Retake this mock
        </ButtonLink>
      )}
    </div>
  );
}
