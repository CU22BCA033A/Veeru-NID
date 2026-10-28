import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { istDateString } from "@/lib/plan/calendar";
import type { Alert, Analytics } from "./analytics";

/** A WhatsApp-ready daily summary for the mentor. */
export async function dailySummary(db: SupabaseClient, userId: string, name: string, a: Analytics, alerts: Alert[]): Promise<string> {
  const today = istDateString(new Date());
  const start = `${today}T00:00:00+05:30`;
  const [{ data: plan }, { data: att }, { data: studio }, { data: refl }, { count: hwPending }] = await Promise.all([
    db.from("daily_plans").select("status,steps,tough_day").eq("user_id", userId).eq("day_no", a.todayNo).maybeSingle(),
    db.from("attempts").select("correct,context").eq("user_id", userId).gte("created_at", start),
    db.from("studio_submissions").select("final_score").eq("user_id", userId).gte("created_at", start),
    db.from("reflections").select("mood,sleep_hours,learned").eq("user_id", userId).eq("day_no", a.todayNo).maybeSingle(),
    db.from("homework").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
  ]);
  const daily = (att ?? []).filter((x) => x.context === "daily");
  const acc = daily.length ? Math.round((daily.filter((x) => x.correct).length / daily.length) * 100) : null;
  const steps = Object.keys((plan?.steps as object) ?? {}).length;
  const mood = ["", "😞", "😕", "😐", "🙂", "😄"][(refl?.mood as number) ?? 0] ?? "";
  const lines = [
    `📘 ${name} · Day ${a.todayNo} summary`,
    plan ? `Status: ${plan.status === "completed" ? "✅ day completed" : `${steps}/6 steps done`}${plan.tough_day ? " (tough-day mode)" : ""}` : "No plan today",
    `Questions: ${(att ?? []).length} attempted${acc !== null ? ` · daily test ${acc}% accurate` : ""}`,
    `Studio: ${(studio ?? []).length} sheet${(studio ?? []).length === 1 ? "" : "s"} uploaded`,
    `Homework pending: ${hwPending ?? 0}`,
    `Streak: ${a.streak} days · sketch streak ${a.sketchStreak} · readiness ${a.readiness ?? "–"}/100`,
    refl ? `Mood ${mood} · slept ${Number(refl.sleep_hours)}h${refl.learned ? ` · learned: "${refl.learned}"` : ""}` : "No reflection yet",
    ...alerts.map((x) => `⚠️ ${x.text}`),
  ];
  return lines.join("\n");
}
