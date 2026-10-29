import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mock } from "@/lib/content/schemas";
import { readiness } from "@/lib/scoring/readiness";
import { addDays, istDateString } from "@/lib/plan/calendar";

export interface MockAnswers {
  uploads?: Record<string, string[]>; // question no → storage paths
  objectiveItemIds?: string[];
  objective?: Record<string, string | string[] | null>;
  selfMarks?: Record<string, number>;
  mentorMarks?: Record<string, number>;
  mentorComments?: Record<string, string>;
  objectiveMarks?: number;
  /** Total time the student paused the on-screen timer; added to the end time. */
  pausedMs?: number;
}

export interface MockRow {
  id: string;
  title: string;
  format: Mock["format"];
  duration_min: number;
  total_marks: number;
  questions: Mock["questions"];
  analysis: Mock["analysis"];
}

export async function getMock(db: SupabaseClient, id: string): Promise<MockRow | null> {
  const { data } = await db.from("mocks").select("id,title,format,duration_min,total_marks,questions,analysis").eq("id", id).maybeSingle();
  return (data as MockRow | null) ?? null;
}

/** Marks per question: mentor's mark wins over self-mark. */
export function mockScore(mock: MockRow, a: MockAnswers): { total: number; byQuestion: Record<number, number | null>; reviewed: boolean; markedMax: number } {
  const byQuestion: Record<number, number | null> = {};
  let total = 0;
  for (const q of mock.questions) {
    // Drawing questions count only once GB has marked them; students don't mark themselves.
    const v = q.kind === "objective" ? a.objectiveMarks ?? null : a.mentorMarks?.[q.no] ?? null;
    byQuestion[q.no] = v;
    total += v ?? 0;
  }
  const reviewed = mock.questions.filter((q) => q.kind === "drawing").every((q) => a.mentorMarks?.[q.no] !== undefined);
  const markedMax = mock.questions.filter((q) => byQuestion[q.no] !== null).reduce((sum, q) => sum + q.marks, 0);
  return { total: Math.round(total * 10) / 10, byQuestion, reviewed, markedMax };
}

/** Score as a percentage of the questions marked so far (null if nothing is marked yet). */
export function markedPercent(mock: MockRow, a: MockAnswers): number | null {
  const s = mockScore(mock, a);
  return s.markedMax ? (s.total / s.markedMax) * 100 : null;
}

/** Recompute readiness from everything we know and store it on the latest mock attempt. */
export async function computeReadiness(db: SupabaseClient, userId: string): Promise<number | null> {
  const today = istDateString(new Date());
  const since = addDays(today, -14);
  const [{ data: mocks }, { data: studio }, { data: attempts }, { data: plans }] = await Promise.all([
    db.from("mock_attempts").select("answers,mocks(id,title,format,duration_min,total_marks,questions)").eq("user_id", userId).not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(5),
    db.from("studio_submissions").select("final_score").eq("user_id", userId).not("final_score", "is", null).order("created_at", { ascending: false }).limit(10),
    db.from("attempts").select("correct").eq("user_id", userId).eq("context", "daily").gte("created_at", `${since}T00:00:00+05:30`),
    db.from("daily_plans").select("status,date").eq("user_id", userId).gte("date", since).lt("date", today),
  ]);
  // Only marked questions count, so a mock waiting for GB's marks isn't treated as zero.
  const mockPercents = (mocks ?? [])
    .map((m) => (m.mocks ? markedPercent(m.mocks as unknown as MockRow, (m.answers ?? {}) as MockAnswers) : null))
    .filter((v): v is number => v !== null);
  const r = readiness({
    mockPercents,
    studioPercents: (studio ?? []).map((s) => Number(s.final_score)),
    dailyAccuracy: attempts?.length ? (attempts.filter((a) => a.correct).length / attempts.length) * 100 : null,
    consistency: plans?.length ? (plans.filter((p) => p.status === "completed").length / plans.length) * 100 : null,
  });
  return r.score;
}
