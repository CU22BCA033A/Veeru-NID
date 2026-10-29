import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getItems } from "@/lib/data/items";
import { getMock, mockScore, type MockAnswers } from "@/lib/data/mocks";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";
import { MarkForm, type MarkQuestion } from "./mark-form";

/** Marking a mock: each drawing question shows the full question, Veeru's sheets and the mark box together. */
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

  const questions: MarkQuestion[] = mock.questions
    .filter((q) => q.kind === "drawing")
    .map((q) => ({
      no: q.no,
      title: q.title,
      prompt: q.prompt,
      parts: q.parts ?? [],
      marks: q.marks,
      suggestedMinutes: q.suggestedMinutes,
      usedMinutes: Math.round((split[q.no] ?? 0) / 60),
      sheets: (answers.uploads?.[q.no] ?? []).map((p) => urls.get(p)).filter((u): u is string => Boolean(u)),
      idealApproach: mock.analysis.find((a) => a.no === q.no)?.idealApproach ?? null,
    }));

  // Objective section: auto-marked; shown so GB can see what was asked and answered.
  const objective = mock.questions.find((q) => q.kind === "objective");
  const objItems = objective && answers.objectiveItemIds?.length ? await getItems(db, answers.objectiveItemIds) : [];
  const optionText = (item: (typeof objItems)[number], id: string) => {
    const o = item.options?.find((x) => x.id === id);
    return o?.text ? `${id.toUpperCase()}. ${o.text}` : id.toUpperCase();
  };
  const show = (item: (typeof objItems)[number], v: string | string[] | null | undefined) =>
    v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)
      ? "Not answered"
      : (Array.isArray(v) ? v : [v]).map((id) => optionText(item, id)).join(", ");
  const isRight = (item: (typeof objItems)[number], v: string | string[] | null | undefined) => {
    if (v === null || v === undefined) return false;
    const want = Array.isArray(item.answer) ? [...item.answer].sort().join(",") : String(item.answer);
    const got = Array.isArray(v) ? [...v].sort().join(",") : String(v);
    return want === got;
  };

  return (
    <div className="space-y-5">
      <PageHeader title={mock.title} kicker={score.markedMax ? `Marked so far ${score.total}/${score.reviewed ? mock.total_marks : score.markedMax}` : "Not marked yet"} back={{ href: "/admin/mocks", label: "Mocks" }}>
        {mock.duration_min} minutes · {mock.total_marks} marks.{answers.objectiveMarks !== undefined && ` Objective section auto-marked: ${answers.objectiveMarks}/${objective?.marks ?? "–"}.`} Readiness {att.readiness ?? "–"}.
      </PageHeader>

      <MarkForm attemptId={aid} questions={questions} initialMarks={answers.mentorMarks ?? {}} initialComments={answers.mentorComments ?? {}} />

      {objective && objItems.length > 0 && (
        <Card>
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2">
              <span>
                <CardLabel>Q{objective.no} · {objective.title} (auto-marked)</CardLabel>
                <span className="text-sm text-ink-2">{objItems.filter((i) => isRight(i, answers.objective?.[i.id])).length} of {objItems.length} correct · tap to see every question</span>
              </span>
            </summary>
            <p className="mt-2 text-sm text-ink-2">{objective.prompt}</p>
            <ol className="mt-3 space-y-3">
              {objItems.map((item, i) => {
                const v = answers.objective?.[item.id];
                const ok = isRight(item, v);
                return (
                  <li key={item.id} className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-medium">{i + 1}. {item.stem}</p>
                    {item.stem_svg && <div className="mt-2 max-w-xs [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: item.stem_svg }} />}
                    <p className={`mt-2 flex items-start gap-1.5 ${ok ? "text-good" : "text-bad"}`}>
                      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-label="correct" /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-label="wrong" />}
                      Veeru: {show(item, v)}
                    </p>
                    {!ok && <p className="mt-1 text-ink-2">Correct: {show(item, item.answer)}</p>}
                  </li>
                );
              })}
            </ol>
          </details>
        </Card>
      )}
    </div>
  );
}
