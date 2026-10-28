"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { finalPercent, scoresSchema, type Scores } from "@/lib/studio/rubric";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveReview(input: { id: string; scores: Scores; comment: string }): Promise<{ error?: string }> {
  await requireViewer("mentor");
  const id = z.string().uuid().parse(input.id);
  const scores = scoresSchema.parse(input.scores);
  const comment = z.string().trim().max(3000).parse(input.comment);
  const db = await supabaseServer();
  const { data: sub } = await db.from("studio_submissions").select("self_scores,ai_scores").eq("id", id).single();
  if (!sub) return { error: "Not found" };
  // Time management stays objective (from the timer) unless the mentor sets it.
  const mentor = { ...scores, time: scores.time ?? (sub.self_scores as Scores | null)?.time };
  const final = finalPercent({ self: sub.self_scores as Scores, ai: sub.ai_scores as Scores, mentor });
  const { error } = await db.from("studio_submissions").update({ mentor_scores: mentor, mentor_comment: comment || null, final_score: final, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/review");
  return {};
}
