"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { refreshDay } from "@/lib/data/day";
import { getPlanById } from "@/lib/data/plan";
import { maybeCritique } from "@/lib/data/studio";
import { istDateString } from "@/lib/plan/calendar";
import { timeScore } from "@/lib/studio/rubric";
import { supabaseServer } from "@/lib/supabase/server";

const submissionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().max(80),
  planId: z.string().uuid().nullable(),
  ctx: z.enum(["test", "daily", "mains"]),
  imagePaths: z.array(z.string().max(200)).min(1).max(12),
  timeLimitS: z.number().int().min(0).max(4 * 3600),
  timeUsedS: z.number().int().min(0).max(12 * 3600),
  hintsUsed: z.number().int().min(0).max(20),
  checklist: z.record(z.string(), z.boolean()),
});

export async function createSubmission(raw: unknown): Promise<{ ok: boolean; id?: string; error?: string }> {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some details were missing." };
  const d = parsed.data;
  const viewer = await requireViewer("student");
  if (!d.imagePaths.every((p) => p.startsWith(`${viewer.id}/${d.id}/`))) return { ok: false, error: "Invalid upload path." };
  const db = await supabaseServer();
  // Only the automatic time score; the student doesn't mark their own work.
  const self = { time: timeScore(d.timeUsedS, d.timeLimitS) };
  const { error } = await db.from("studio_submissions").insert({
    id: d.id, user_id: viewer.id, task_id: d.taskId, plan_id: d.planId, context: d.ctx, image_paths: d.imagePaths,
    time_limit_s: d.timeLimitS, time_used_s: d.timeUsedS, hints_used: d.hintsUsed, self_scores: self, checklist: d.checklist,
    final_score: null, // set when GB (or the optional AI) scores it
  });
  if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
  if (d.planId) {
    const plan = await getPlanById(db, d.planId);
    if (plan) await refreshDay(db, plan, await loadSettings());
  }
  await maybeCritique(db, d.id);
  revalidatePath("/", "layout");
  return { ok: true, id: d.id };
}

export async function logSketch(input: { minutes: number; imagePath: string | null }) {
  const viewer = await requireViewer("student");
  const minutes = z.number().int().min(1).max(600).parse(input.minutes);
  const imagePath = input.imagePath && input.imagePath.startsWith(`${viewer.id}/sketch/`) ? input.imagePath : null;
  const db = await supabaseServer();
  const date = istDateString(new Date());
  const { data: existing } = await db.from("sketch_logs").select("minutes").eq("user_id", viewer.id).eq("date", date).maybeSingle();
  await db.from("sketch_logs").upsert(
    { user_id: viewer.id, date, minutes: (existing?.minutes as number | undefined ?? 0) + minutes, ...(imagePath ? { image_path: imagePath } : {}) },
    { onConflict: "user_id,date" },
  );
  revalidatePath("/", "layout");
}
