"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer, studentProfile } from "@/lib/auth";
import { computeReadiness, getMock, mockScore, type MockAnswers } from "@/lib/data/mocks";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveMockMarks(input: { attemptId: string; marks: Record<string, number>; comments: Record<string, string> }): Promise<{ error?: string }> {
  await requireViewer("mentor");
  const id = z.string().uuid().parse(input.attemptId);
  const db = await supabaseServer();
  const { data: att } = await db.from("mock_attempts").select("mock_id,answers,user_id").eq("id", id).single();
  if (!att) return { error: "Not found" };
  const mock = await getMock(db, att.mock_id as string);
  if (!mock) return { error: "Mock not found" };
  const answers = att.answers as MockAnswers;
  const mentorMarks: Record<string, number> = {};
  for (const q of mock.questions.filter((x) => x.kind === "drawing")) {
    const v = input.marks[q.no];
    if (typeof v === "number") mentorMarks[q.no] = Math.max(0, Math.min(q.marks, v));
  }
  const next = { ...answers, mentorMarks, mentorComments: Object.fromEntries(Object.entries(input.comments).map(([k, v]) => [k, z.string().max(1500).parse(v)])) };
  const score = mockScore(mock, next);
  await db.from("mock_attempts").update({ answers: next, est_score: score.total }).eq("id", id);
  // keep the per-question studio records in step (feeds analytics)
  for (const [no, m] of Object.entries(mentorMarks)) {
    const q = mock.questions.find((x) => String(x.no) === no)!;
    await db.from("studio_submissions").update({ final_score: Math.round((m / q.marks) * 100), mentor_comment: next.mentorComments[no] ?? null, reviewed_at: new Date().toISOString() }).eq("mock_attempt_id", id).eq("question_no", Number(no));
  }
  const student = await studentProfile();
  if (student) await db.from("mock_attempts").update({ readiness: await computeReadiness(db, student.id) }).eq("id", id);
  revalidatePath("/admin/mocks");
  return {};
}
