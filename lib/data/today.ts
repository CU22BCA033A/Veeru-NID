import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSettings, type AppSettings } from "@/lib/config/settings";
import { dayKind, dayNumberFor, istDateString, type DayKind } from "@/lib/plan/calendar";
import { refreshDay, type DayProgress } from "./day";
import { ensurePlan, type PlanRow } from "./plan";

export interface TodayContext {
  settings: AppSettings;
  today: string;
  todayNo: number;
  kind: DayKind;
  plan: PlanRow | null;
  progress: DayProgress | null;
}

export async function todayContext(db: SupabaseClient, userId: string): Promise<TodayContext> {
  const settings = await loadSettings();
  const today = istDateString(new Date());
  const todayNo = dayNumberFor(today, settings.phases.startDate);
  const kind = dayKind(todayNo, settings.phases);
  let plan: PlanRow | null = null;
  let progress: DayProgress | null = null;
  if (todayNo >= 1 && todayNo <= settings.phases.totalDays) {
    plan = await ensurePlan(db, userId, todayNo, settings);
    if (plan) progress = await refreshDay(db, plan, settings);
  }
  return { settings, today, todayNo, kind, plan, progress };
}

/** Earlier days that aren't finished: they roll forward as catch-up. */
export async function catchUpDays(db: SupabaseClient, userId: string, todayNo: number) {
  const { data } = await db
    .from("daily_plans")
    .select("id,day_no,status,steps")
    .eq("user_id", userId)
    .lt("day_no", todayNo)
    .neq("status", "completed")
    .order("day_no", { ascending: false })
    .limit(5);
  return (data ?? []) as { id: string; day_no: number; status: string; steps: Record<string, string> }[];
}
