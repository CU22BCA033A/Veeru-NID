import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/lib/config/settings";
import { buildDay, type PoolItem, type Rating } from "@/lib/plan/builder";
import { addDays, dateForDay, dayKind, dayNumberFor, istDateString, phaseForDay } from "@/lib/plan/calendar";
import type { StepState } from "@/lib/plan/steps";
import { fetchAll } from "./fetch";

export interface PlanRow {
  id: string;
  user_id: string;
  day_no: number;
  date: string;
  phase: string;
  warmup_item_ids: string[];
  item_ids: string[];
  /** Repeats inside item_ids, shown labelled "Review". */
  review_item_ids: string[];
  studio_task_ids: string[];
  daily_task_id: string | null;
  tip_id: string | null;
  mock_id: string | null;
  steps: StepState;
  status: "pending" | "in_progress" | "completed" | "missed";
  tough_day: boolean;
  completed_at: string | null;
}

const PLAN_COLS = "id,user_id,day_no,date,phase,warmup_item_ids,item_ids,review_item_ids,studio_task_ids,daily_task_id,tip_id,mock_id,steps,status,tough_day,completed_at";

export async function getPlan(db: SupabaseClient, userId: string, dayNo: number): Promise<PlanRow | null> {
  const { data, error } = await db.from("daily_plans").select(PLAN_COLS).eq("user_id", userId).eq("day_no", dayNo).maybeSingle();
  return (data as PlanRow | null) ?? null;
}

export async function getPlanById(db: SupabaseClient, planId: string): Promise<PlanRow | null> {
  const { data } = await db.from("daily_plans").select(PLAN_COLS).eq("id", planId).maybeSingle();
  return (data as PlanRow | null) ?? null;
}

/** Put a short-answer item after roughly every few quick items so the test feels varied. */
function weave(quick: string[], short: string[]): string[] {
  if (!short.length) return quick;
  const gap = Math.max(1, Math.floor(quick.length / (short.length + 1)));
  const out: string[] = [];
  let s = 0;
  quick.forEach((q, i) => {
    out.push(q);
    if ((i + 1) % gap === 0 && s < short.length) out.push(short[s++]!);
  });
  while (s < short.length) out.push(short[s++]!);
  return out;
}

/** Create (once) and return the plan for a day. Safe to call concurrently. */
export async function ensurePlan(db: SupabaseClient, userId: string, dayNo: number, settings: AppSettings): Promise<PlanRow | null> {
  const existing = await getPlan(db, userId, dayNo);
  if (existing) return existing;
  const { phases } = settings;
  const phase = phaseForDay(dayNo, phases);
  if (!phase) return null;
  const kind = dayKind(dayNo, phases);
  const date = dateForDay(dayNo, phases.startDate);

  let built = { warmup: [] as string[], quick: [] as string[], short: [] as string[], review: [] as string[], studioTest: [] as string[], dailyTask: null as string | null, tipId: null as string | null };
  let mockId: string | null = null;

  if (kind === "study" || kind === "mock") {
    const today = istDateString(new Date());
    const [items, readyImages, served, ratingsRows, studio, plans, tips, mocks, mockAttempts] = await Promise.all([
      fetchAll<{ id: string; type: PoolItem["type"]; subtopic_id: string; category_id: string; difficulty: number; generator: string | null; image_ids: string[]; valid_until: string | null; source: string }>(
        () => db.from("items").select("id,type,subtopic_id,category_id,difficulty,generator,image_ids,valid_until,source").eq("status", "live").order("id"),
      ),
      fetchAll<{ id: string }>(() => db.from("images").select("id").eq("status", "ready").order("id")),
      fetchAll<{ item_id: string; first_served_at: string }>(() => db.from("served_items").select("item_id,first_served_at").eq("user_id", userId).order("item_id")),
      fetchAll<{ subtopic_id: string; rating: number; attempts: number }>(() => db.from("skill_ratings").select("subtopic_id,rating,attempts").eq("user_id", userId).order("subtopic_id")),
      fetchAll<{ id: string; kind: "test" | "daily" | "mains"; phases: string[]; category: string }>(() => db.from("studio_tasks").select("id,kind,phases,category").eq("status", "live").order("id")),
      fetchAll<{ studio_task_ids: string[]; daily_task_id: string | null; tip_id: string | null; mock_id: string | null }>(
        () => db.from("daily_plans").select("studio_task_ids,daily_task_id,tip_id,mock_id").eq("user_id", userId).order("day_no"),
      ),
      fetchAll<{ id: string; phases: string[] }>(() => db.from("tips").select("id,phases").order("id")),
      fetchAll<{ id: string; format: string }>(() => db.from("mocks").select("id,format").eq("status", "live").order("id")),
      fetchAll<{ mock_id: string }>(() => db.from("mock_attempts").select("mock_id").eq("user_id", userId).order("mock_id")),
    ]);
    const ready = new Set(readyImages.map((r) => r.id));
    const pool: PoolItem[] = items
      .filter((i) => i.image_ids.every((img) => ready.has(img)) && (!i.valid_until || i.valid_until >= today))
      .map((i) => ({ id: i.id, type: i.type, subtopic: i.subtopic_id, category: i.category_id, difficulty: i.difficulty, generator: i.generator, source: i.source }));
    const ratings = new Map<string, Rating>(ratingsRows.map((r) => [r.subtopic_id, { rating: Number(r.rating), attempts: r.attempts }]));
    const usedStudio = new Set(plans.flatMap((p) => [...p.studio_task_ids, ...(p.daily_task_id ? [p.daily_task_id] : [])]));
    const usedTips = new Set(plans.map((p) => p.tip_id).filter(Boolean) as string[]);

    if (kind === "mock") {
      const usedMocks = new Set([...plans.map((p) => p.mock_id), ...mockAttempts.map((m) => m.mock_id)].filter(Boolean) as string[]);
      const wanted = phase.mock?.kind === "mini" ? "mini" : "2026";
      mockId = mocks.find((m) => m.format === wanted && !usedMocks.has(m.id))?.id ?? mocks.find((m) => !usedMocks.has(m.id))?.id ?? null;
    }
    built = buildDay({
      dayNo, phase, pool, served: new Set(served.map((s) => s.item_id)), ratings, totalDays: phases.totalDays,
      // seen at least two weeks ago → may come back as labelled review
      reviewable: new Set(served.filter((s) => Date.now() - new Date(s.first_served_at).getTime() >= 14 * 86_400_000).map((s) => s.item_id)),
      studioPool: studio, usedStudio, tips, usedTips, seed: dayNo * 7919 + userId.charCodeAt(0), mockDay: kind === "mock" && Boolean(mockId),
    });
  }

  const row = {
    user_id: userId, day_no: dayNo, date, phase: phase.id,
    warmup_item_ids: built.warmup, item_ids: weave(built.quick, built.short), review_item_ids: built.review, studio_task_ids: built.studioTest,
    daily_task_id: built.dailyTask, tip_id: built.tipId, mock_id: mockId,
  };
  const { error } = await db.from("daily_plans").insert(row);
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  const plan = await getPlan(db, userId, dayNo);
  if (plan && !error) {
    const servedRows = [
      ...plan.warmup_item_ids.map((id) => ({ user_id: userId, item_id: id, context: "warmup" })),
      ...plan.item_ids.map((id) => ({ user_id: userId, item_id: id, context: "daily" })),
    ];
    if (servedRows.length) await db.from("served_items").upsert(servedRows, { onConflict: "user_id,item_id", ignoreDuplicates: true });
    await scheduleDueReviews(db, userId, dayNo, date);
  }
  return plan;
}

/** Spaced-repetition reviews due on or before this day become 'review' homework. */
export async function scheduleDueReviews(db: SupabaseClient, userId: string, dayNo: number, date: string) {
  const { data: due } = await db.from("srs_cards").select("item_id").eq("user_id", userId).eq("retired", false).lte("due", date);
  if (!due?.length) return;
  await db.from("homework").upsert(
    due.map((d) => ({ user_id: userId, day_no: dayNo, item_id: d.item_id, kind: "review" })),
    { onConflict: "user_id,day_no,item_id", ignoreDuplicates: true },
  );
}

export async function markStep(db: SupabaseClient, plan: PlanRow, step: keyof StepState) {
  if (plan.steps[step]) return plan;
  const steps = { ...plan.steps, [step]: new Date().toISOString() };
  await db.from("daily_plans").update({ steps, status: "in_progress" }).eq("id", plan.id);
  return { ...plan, steps };
}

export { addDays };

/**
 * An extra mixed test outside the day plan (a second test today, or practice before Day 1).
 * Same mixing rules as the daily test: every category, varied puzzle types, few mirror images.
 */
export async function buildExtraTest(db: SupabaseClient, userId: string, settings: AppSettings, count = 30): Promise<{ ids: string[]; review: string[] }> {
  const { phases } = settings;
  const today = istDateString(new Date());
  const dayNo = Math.max(1, Math.min(phases.totalDays, dayNumberFor(today, phases.startDate)));
  const basePhase = phaseForDay(dayNo, phases) ?? phases.phases[0]!;
  const [items, readyImages, served, ratingsRows] = await Promise.all([
    fetchAll<{ id: string; type: PoolItem["type"]; subtopic_id: string; category_id: string; difficulty: number; generator: string | null; image_ids: string[]; valid_until: string | null; source: string }>(
      () => db.from("items").select("id,type,subtopic_id,category_id,difficulty,generator,image_ids,valid_until,source").eq("status", "live").neq("type", "short").order("id"),
    ),
    fetchAll<{ id: string }>(() => db.from("images").select("id").eq("status", "ready").order("id")),
    fetchAll<{ item_id: string; first_served_at: string }>(() => db.from("served_items").select("item_id,first_served_at").eq("user_id", userId).order("item_id")),
    fetchAll<{ subtopic_id: string; rating: number; attempts: number }>(() => db.from("skill_ratings").select("subtopic_id,rating,attempts").eq("user_id", userId).order("subtopic_id")),
  ]);
  const ready = new Set(readyImages.map((r) => r.id));
  const pool: PoolItem[] = items
    .filter((i) => i.image_ids.every((img) => ready.has(img)) && (!i.valid_until || i.valid_until >= today))
    .map((i) => ({ id: i.id, type: i.type, subtopic: i.subtopic_id, category: i.category_id, difficulty: i.difficulty, generator: i.generator, source: i.source }));
  const built = buildDay({
    dayNo, phase: { ...basePhase, mix: { quick: count, short: 0, studio: 0 }, minItems: count }, pool,
    served: new Set(served.map((s) => s.item_id)),
    ratings: new Map<string, Rating>(ratingsRows.map((r) => [r.subtopic_id, { rating: Number(r.rating), attempts: r.attempts }])),
    studioPool: [], usedStudio: new Set(), tips: [], usedTips: new Set(), seed: Date.now() % 1_000_000, totalDays: phases.totalDays,
    reviewable: new Set(served.filter((s) => Date.now() - new Date(s.first_served_at).getTime() >= 14 * 86_400_000).map((s) => s.item_id)),
  });
  const review = new Set(built.review);
  const fresh = built.quick.filter((id) => !review.has(id));
  if (fresh.length) await db.from("served_items").upsert(fresh.map((id) => ({ user_id: userId, item_id: id, context: "extra" })), { onConflict: "user_id,item_id", ignoreDuplicates: true });
  return { ids: built.quick, review: built.review };
}
