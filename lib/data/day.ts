import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/lib/config/settings";
import { dayKind, phaseForDay } from "@/lib/plan/calendar";
import type { StepState } from "@/lib/plan/steps";
import type { PlanRow } from "./plan";

export interface DayProgress {
  steps: StepState;
  attempted: number;
  required: number;
  testItemsDone: number;
  studioDone: string[];
  pendingHomework: number;
  complete: boolean;
}

/** Items required to close a day (halved on a tough day). */
export function requiredItems(plan: PlanRow, settings: AppSettings): number {
  const phase = phaseForDay(plan.day_no, settings.phases);
  const base = phase?.minItems ?? 0;
  const total = plan.item_ids.length + plan.studio_task_ids.length;
  const req = Math.min(base, total);
  return plan.tough_day ? Math.ceil(req / 2) : req;
}

/**
 * Recompute a day's steps from what actually happened (attempts, uploads, reflection) and
 * persist them. A day completes only when every step is done AND the minimum count is met.
 */
export async function refreshDay(db: SupabaseClient, plan: PlanRow, settings: AppSettings): Promise<DayProgress> {
  const kind = dayKind(plan.day_no, settings.phases);
  const [{ data: attempts }, { data: studio }, { count: pendingHw }, { data: reflection }, { data: mockAttempt }] = await Promise.all([
    db.from("attempts").select("item_id,context").eq("plan_id", plan.id),
    db.from("studio_submissions").select("task_id,context").eq("plan_id", plan.id),
    db.from("homework").select("*", { count: "exact", head: true }).eq("user_id", plan.user_id).eq("status", "pending").lte("day_no", plan.day_no),
    db.from("reflections").select("day_no").eq("user_id", plan.user_id).eq("day_no", plan.day_no).maybeSingle(),
    plan.mock_id
      ? db.from("mock_attempts").select("id,submitted_at").eq("user_id", plan.user_id).eq("mock_id", plan.mock_id).not("submitted_at", "is", null).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const dailyItems = new Set((attempts ?? []).filter((a) => a.context === "daily").map((a) => a.item_id as string));
  const warmupDone = (attempts ?? []).some((a) => a.context === "warmup");
  const studioDone = [...new Set((studio ?? []).filter((s) => s.context === "test").map((s) => s.task_id as string))];
  const dailyTaskDone = (studio ?? []).some((s) => s.context === "daily" || s.context === "mains");
  const required = requiredItems(plan, settings);
  const attempted = dailyItems.size + studioDone.length;

  const now = new Date().toISOString();
  const steps: StepState = { ...plan.steps };
  const set = (k: keyof StepState, cond: boolean) => {
    if (cond && !steps[k]) steps[k] = now;
  };
  set("warmup", warmupDone || plan.warmup_item_ids.length === 0);
  const testDone = plan.mock_id ? Boolean(mockAttempt) : dailyItems.size > 0 && attempted >= required && plan.studio_task_ids.every((t) => studioDone.includes(t) || plan.tough_day);
  set("test", testDone);
  set("homework", Boolean(steps.result) && (pendingHw ?? 0) === 0);
  set("task", dailyTaskDone || !plan.daily_task_id);
  set("reflection", Boolean(reflection));

  const allSteps = ["warmup", "test", "result", "homework", "task", "reflection"] as const;
  const complete = kind === "study" || kind === "mock" ? allSteps.every((s) => steps[s]) && (plan.mock_id ? true : attempted >= required) : Boolean(reflection);
  const status = complete ? "completed" : Object.keys(steps).length ? "in_progress" : plan.status;
  if (JSON.stringify(steps) !== JSON.stringify(plan.steps) || status !== plan.status) {
    await db.from("daily_plans").update({ steps, status, completed_at: complete ? plan.completed_at ?? now : null }).eq("id", plan.id);
  }
  return { steps, attempted, required, testItemsDone: dailyItems.size, studioDone, pendingHomework: pendingHw ?? 0, complete };
}
