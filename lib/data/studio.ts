import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiEnabled, critiquePrompt, critiqueSheets, type SheetImage } from "@/lib/ai/critique";
import { finalPercent, type Scores } from "@/lib/studio/rubric";
import { istDateString } from "@/lib/plan/calendar";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Run the optional AI critique for a submission (respects the daily call cap). */
export async function maybeCritique(db: SupabaseClient, submissionId: string): Promise<void> {
  if (!aiEnabled()) return;
  const admin = supabaseAdmin();
  const cap = Number(process.env.AI_DAILY_CALL_CAP ?? 20);
  const since = `${istDateString(new Date())}T00:00:00+05:30`;
  const { count } = await admin.from("ai_usage").select("*", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= cap) return;

  const { data: sub } = await admin.from("studio_submissions").select("id,user_id,task_id,image_paths,time_used_s,self_scores,mentor_scores,ai_scores").eq("id", submissionId).single();
  if (!sub?.task_id || !sub.image_paths?.length) return;
  const { data: task } = await admin.from("studio_tasks").select("title,brief,minutes,examiner_checklist").eq("id", sub.task_id).single();
  if (!task) return;

  const images: SheetImage[] = [];
  for (const path of (sub.image_paths as string[]).slice(0, 6)) {
    const { data } = await admin.storage.from("sheets").download(path);
    if (!data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    images.push({ mediaType: path.endsWith(".jpg") ? "image/jpeg" : "image/webp", base64: buf.toString("base64") });
  }
  try {
    const r = await critiqueSheets(
      critiquePrompt({ title: task.title as string, brief: task.brief as string, minutes: task.minutes as number, checklist: task.examiner_checklist as string[] }, ((sub.time_used_s as number) ?? 0) / 60),
      images,
    );
    await admin.from("ai_usage").insert({ user_id: sub.user_id, provider: r.provider, model: r.model, purpose: "studio-critique", input_tokens: r.inTokens, output_tokens: r.outTokens });
    if (!r.critique) return;
    const time = (sub.self_scores as Scores | null)?.time;
    const aiScores = { ...r.critique.scores, time };
    const final = finalPercent({ ai: aiScores, mentor: sub.mentor_scores as Scores | null });
    await admin.from("studio_submissions").update({ ai_scores: { ...aiScores, critique: r.critique }, ai_provider: `${r.provider}:${r.model}`, final_score: final }).eq("id", submissionId);
  } catch (e) {
    console.error("AI critique failed", e);
  }
  void db;
}
