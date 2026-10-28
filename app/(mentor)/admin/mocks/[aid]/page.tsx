import { notFound } from "next/navigation";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getMock, mockScore, type MockAnswers } from "@/lib/data/mocks";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";
import { MarkForm } from "./mark-form";

export default async function MarkMock({ params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  const db = await supabaseServer();
  const { data: att } = await db.from("mock_attempts").select("*").eq("id", aid).maybeSingle();
  if (!att?.submitted_at) notFound();
  const mock = await getMock(db, att.mock_id as string);
  if (!mock) notFound();
  const answers = att.answers as MockAnswers;
  const urls = await signedSheetUrls(db, Object.values(answers.uploads ?? {}).flat());
  const split = (att.time_split ?? {}) as Record<string, number>;
  const score = mockScore(mock, answers);
  const drawing = mock.questions.filter((q) => q.kind === "drawing");
  return (
    <div className="space-y-5">
      <PageHeader title={mock.title} kicker={`Score ${score.total}/${mock.total_marks}`} back={{ href: "/admin/mocks", label: "Mocks" }}>
        {answers.objectiveMarks !== undefined && `Objective section (auto-marked): ${answers.objectiveMarks}. `}Readiness {att.readiness ?? "–"}.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {drawing.map((q) => (
            <Card key={q.no}>
              <CardLabel>Q{q.no} · {q.title} · {q.marks} marks · {Math.round((split[q.no] ?? 0) / 60)}/{q.suggestedMinutes} min</CardLabel>
              <p className="mt-1 text-sm">{q.prompt}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(answers.uploads?.[q.no] ?? []).map((p) => urls.get(p) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={p} href={urls.get(p)} target="_blank" rel="noreferrer"><img src={urls.get(p)} alt={`Q${q.no} sheet`} className="w-full rounded-lg border border-line" /></a>
                ))}
                {!(answers.uploads?.[q.no] ?? []).length && <p className="text-sm text-ink-3">No sheets uploaded.</p>}
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-fit lg:sticky lg:top-20">
          <CardLabel className="mb-3">Your marks</CardLabel>
          <MarkForm attemptId={aid} questions={drawing.map((q) => ({ no: q.no, title: q.title, marks: q.marks }))} initialMarks={answers.mentorMarks ?? {}} initialComments={answers.mentorComments ?? {}} selfMarks={answers.selfMarks ?? {}} />
        </Card>
      </div>
    </div>
  );
}
