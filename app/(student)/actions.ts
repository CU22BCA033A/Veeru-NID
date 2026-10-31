"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { recordAttempts, updateSrs } from "@/lib/data/attempts";
import { refreshDay } from "@/lib/data/day";
import { buildExtraTest, getPlanById } from "@/lib/data/plan";
import { dayNumberFor, istDateString } from "@/lib/plan/calendar";
import { supabaseServer } from "@/lib/supabase/server";

const answerSchema = z.union([z.string().max(5000), z.array(z.string().max(10)).max(10), z.null()]);
const runSchema = z.object({
  key: z.string().max(200),
  context: z.enum(["warmup", "daily", "homework", "drill", "review"]),
  planId: z.string().uuid().nullable(),
  attempts: z
    .array(z.object({ itemId: z.string().max(80), answer: answerSchema, confidence: z.enum(["sure", "guess"]).nullable(), timeMs: z.number().int().min(0), clientId: z.string().max(300) }))
    .max(120),
  homeworkIds: z.array(z.string().uuid()).max(200).optional(),
});

export async function submitRun(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = runSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That submission looked malformed." };
  const p = parsed.data;
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const settings = await loadSettings();
  const today = istDateString(new Date());
  const todayNo = dayNumberFor(today, settings.phases.startDate);
  const plan = p.planId ? await getPlanById(db, p.planId) : null;
  if (p.planId && (!plan || plan.user_id !== viewer.id)) return { ok: false, error: "Plan not found." };

  // "review" = a retake of questions already answered: practice only, no homework or rating change.
  const retake = p.context === "review";
  const results = await recordAttempts(db, p.attempts, {
    userId: viewer.id, planId: p.context === "homework" || retake ? null : p.planId, context: p.context, dayNo: plan?.day_no ?? todayNo, today,
    makeHomework: p.context === "daily" || p.context === "drill",
    updateRatings: !retake,
  });

  if (p.context === "homework" && p.homeworkIds?.length) {
    const { data: hw } = await db.from("homework").select("id,item_id,kind").in("id", p.homeworkIds).eq("user_id", viewer.id);
    for (const h of hw ?? []) {
      const r = results.find((x) => x.itemId === h.item_id);
      if (h.kind === "review" || h.kind === "reattempt") await updateSrs(db, viewer.id, h.item_id as string, Boolean(r?.correct), today);
    }
    await db.from("homework").update({ status: "done", done_at: new Date().toISOString() }).in("id", (hw ?? []).map((h) => h.id as string));
  }
  if (plan && !retake) await refreshDay(db, plan, settings);
  // Refresh today's plan too (homework may close it).
  const { data: todayPlan } = await db.from("daily_plans").select("id").eq("user_id", viewer.id).eq("day_no", todayNo).maybeSingle();
  if (todayPlan && todayPlan.id !== plan?.id) {
    const tp = await getPlanById(db, todayPlan.id as string);
    if (tp) await refreshDay(db, tp, settings);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setToughDay(planId: string, on: boolean) {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  await db.from("daily_plans").update({ tough_day: on }).eq("id", z.string().uuid().parse(planId)).eq("user_id", viewer.id);
  const plan = await getPlanById(db, planId);
  if (plan) await refreshDay(db, plan, await loadSettings());
  revalidatePath("/", "layout");
}

const reflectionSchema = z.object({
  dayNo: z.coerce.number().int().min(-60).max(400),
  mood: z.coerce.number().int().min(1).max(5),
  energy: z.coerce.number().int().min(1).max(5),
  sleep: z.coerce.number().min(0).max(24),
  learned: z.string().trim().max(500),
  observation: z.string().trim().max(1000).optional(),
});

export async function saveReflection(_prev: { message: string | null }, form: FormData): Promise<{ message: string | null }> {
  const viewer = await requireViewer("student");
  const parsed = reflectionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Pick your mood and energy, and enter hours slept." };
  const d = parsed.data;
  const db = await supabaseServer();
  const { error } = await db.from("reflections").upsert({
    user_id: viewer.id, day_no: d.dayNo, mood: d.mood, energy: d.energy, sleep_hours: d.sleep, learned: d.learned, observation: d.observation ?? null,
  });
  if (error) return { message: error.message };
  const { data: plan } = await db.from("daily_plans").select("id").eq("user_id", viewer.id).eq("day_no", d.dayNo).maybeSingle();
  if (plan) {
    const p = await getPlanById(db, plan.id as string);
    if (p) await refreshDay(db, p, await loadSettings());
  }
  revalidatePath("/", "layout");
  return { message: "Saved. Well done today." };
}

export async function reportItem(itemId: string, reason: string) {
  const viewer = await requireViewer();
  const db = await supabaseServer();
  await db.from("item_reports").insert({ user_id: viewer.id, item_id: z.string().max(80).parse(itemId), reason: z.string().trim().min(3).max(500).parse(reason) });
}

export async function saveMistakeNote(attemptId: string, note: string) {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  await db.from("attempts").update({ note: z.string().trim().max(300).parse(note) }).eq("id", z.string().uuid().parse(attemptId)).eq("user_id", viewer.id);
  revalidatePath("/notebook");
}

/** Short answers: the student checks their answer against the model answer. */
export async function skipHomework(reason: string) {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const r = z.string().trim().min(3, "Give a short reason").max(300).parse(reason);
  const todayNo = dayNumberFor(istDateString(new Date()), (await loadSettings()).phases.startDate);
  await db.from("homework").update({ status: "skipped", skip_reason: r, done_at: new Date().toISOString() }).eq("user_id", viewer.id).eq("status", "pending").lt("day_no", todayNo);
  revalidatePath("/", "layout");
}

export async function markResultSeen(planId: string) {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const plan = await getPlanById(db, z.string().uuid().parse(planId));
  if (!plan || plan.user_id !== viewer.id || plan.steps.result) return;
  const { count } = await db.from("attempts").select("*", { count: "exact", head: true }).eq("plan_id", plan.id).eq("context", "daily");
  if (!count) return;
  await db.from("daily_plans").update({ steps: { ...plan.steps, result: new Date().toISOString() } }).eq("id", plan.id);
  const fresh = await getPlanById(db, plan.id);
  if (fresh) await refreshDay(db, fresh, await loadSettings());
}

/** Start an extra 30-question mixed test (a second test today, or practice before Day 1). */
export async function startExtraTest() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { ids, review } = await buildExtraTest(db, viewer.id, await loadSettings(), 30);
  if (!ids.length) redirect("/?extra=empty");
  const q = new URLSearchParams({ run: String(Date.now()), ids: ids.join(","), review: review.join(",") });
  redirect(`/practice?${q.toString()}`);
}
