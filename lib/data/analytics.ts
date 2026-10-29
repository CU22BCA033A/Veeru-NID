import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import taxonomy from "@/content/taxonomy.json";
import type { AppSettings } from "@/lib/config/settings";
import { addDays, dateForDay, dayKind, dayNumberFor, istDateString } from "@/lib/plan/calendar";
import { weakestSubtopics } from "@/lib/plan/builder";
import { currentStreak } from "@/lib/plan/streak";
import { RUBRIC, type Scores } from "@/lib/studio/rubric";
import { fetchAll } from "./fetch";
import { computeReadiness } from "./mocks";

const CAT_NAME = new Map(taxonomy.categories.map((c) => [c.id, c.name] as [string, string]));
const SUB_NAME = new Map(taxonomy.categories.flatMap((c) => c.subtopics.map((s) => [s.id, s.name] as [string, string])));

export interface Analytics {
  todayNo: number;
  streak: number;
  sketchStreak: number;
  daysCompleted: number;
  itemsSolved: number;
  studioSheets: number;
  mocksDone: number;
  accuracyTrend: { date: string; label: string; accuracy: number | null; rolling7: number | null; avgSeconds: number | null; n: number }[];
  categoryRadar: { category: string; accuracy: number; n: number }[];
  rubric: { criterion: string; first: number | null; recent: number | null }[];
  readiness: number | null;
  readinessSeries: { label: string; readiness: number }[];
  target: number;
  weakest: { id: string; name: string; rating: number }[];
  heatmap: { day: number; date: string; status: "completed" | "partial" | "missed" | "free" | "future" | "today" }[];
  wellbeing: { day: number; mood: number | null; energy: number | null; sleep: number | null }[];
  badges: { id: string; label: string; earned: boolean }[];
}

const istDay = (ts: string) => istDateString(new Date(ts));

export async function loadAnalytics(db: SupabaseClient, userId: string, settings: AppSettings): Promise<Analytics> {
  const today = istDateString(new Date());
  const todayNo = dayNumberFor(today, settings.phases.startDate);
  const since30 = addDays(today, -29);
  const readinessP = computeReadiness(db, userId); // independent: start it alongside the rest
  const [plans, attempts, ratings, subs, sketches, mocks, reflections, hw] = await Promise.all([
    fetchAll<{ day_no: number; status: string; date: string }>(() => db.from("daily_plans").select("day_no,status,date").eq("user_id", userId).order("day_no")),
    fetchAll<{ correct: boolean; time_ms: number | null; created_at: string; context: string; items: { category_id: string } | null }>(
      () => db.from("attempts").select("correct,time_ms,created_at,context,items(category_id)").eq("user_id", userId).order("created_at"),
    ),
    db.from("skill_ratings").select("subtopic_id,rating,attempts").eq("user_id", userId).then((r) => r.data ?? []),
    db.from("studio_submissions").select("self_scores,ai_scores,mentor_scores,created_at").eq("user_id", userId).neq("context", "mock").order("created_at").then((r) => r.data ?? []),
    db.from("sketch_logs").select("date").eq("user_id", userId).then((r) => r.data ?? []),
    db.from("mock_attempts").select("readiness,submitted_at,mocks(format)").eq("user_id", userId).not("submitted_at", "is", null).order("submitted_at").then((r) => r.data ?? []),
    db.from("reflections").select("day_no,mood,energy,sleep_hours").eq("user_id", userId).order("day_no", { ascending: false }).limit(14).then((r) => r.data ?? []),
    db.from("homework").select("status,day_no").eq("user_id", userId).then((r) => r.data ?? []),
  ]);

  const completed = new Set(plans.filter((p) => p.status === "completed").map((p) => p.day_no));
  const freeDays = new Set(settings.phases.phases.flatMap((p) => [...(p.restDays ?? []), ...(p.id === "EXAM" ? [p.fromDay] : [])]));
  const sketchDays = new Set(sketches.map((s) => s.date as string));
  let sketchStreak = 0;
  for (let i = 0; i < 400; i++) {
    if (sketchDays.has(addDays(today, -i))) sketchStreak++;
    else if (i > 0) break;
  }

  // Daily-test accuracy & speed, last 30 days, with a 7-day rolling accuracy.
  const daily = attempts.filter((a) => a.context === "daily");
  const byDate = new Map<string, { n: number; c: number; t: number; tn: number }>();
  for (const a of daily) {
    const d = istDay(a.created_at);
    const v = byDate.get(d) ?? { n: 0, c: 0, t: 0, tn: 0 };
    v.n++;
    if (a.correct) v.c++;
    if (a.time_ms) { v.t += a.time_ms; v.tn++; }
    byDate.set(d, v);
  }
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const accuracyTrend = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(since30, i);
    const v = byDate.get(date);
    const window = Array.from({ length: 7 }, (_, k) => byDate.get(addDays(date, -k))).filter(Boolean) as { n: number; c: number }[];
    const wn = window.reduce((s, x) => s + x.n, 0), wc = window.reduce((s, x) => s + x.c, 0);
    return {
      date, label: fmt.format(new Date(`${date}T00:00:00Z`)),
      accuracy: v ? Math.round((v.c / v.n) * 100) : null,
      rolling7: wn ? Math.round((wc / wn) * 100) : null,
      avgSeconds: v?.tn ? Math.round(v.t / v.tn / 1000) : null,
      n: v?.n ?? 0,
    };
  });

  const byCat = new Map<string, { n: number; c: number }>();
  for (const a of attempts) {
    const c = a.items?.category_id;
    if (!c || a.context === "homework") continue;
    const v = byCat.get(c) ?? { n: 0, c: 0 };
    v.n++;
    if (a.correct) v.c++;
    byCat.set(c, v);
  }
  const categoryRadar = [...byCat.entries()].filter(([, v]) => v.n >= 3).map(([c, v]) => ({ category: CAT_NAME.get(c) ?? c, accuracy: Math.round((v.c / v.n) * 100), n: v.n }));

  const scored = subs.map((s) => (s.mentor_scores ?? s.ai_scores) as Scores | null).filter(Boolean) as Scores[];
  const avgOf = (list: Scores[], id: (typeof RUBRIC)[number]["id"], max: number) => {
    const vals = list.map((s) => s[id]).filter((v): v is number => typeof v === "number");
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / max) * 100) : null;
  };
  const first = scored.slice(0, 5), recent = scored.length > 5 ? scored.slice(-5) : [];
  const rubric = RUBRIC.map((c) => ({ criterion: c.label.replace(/ &.*| \(.*/, ""), first: avgOf(first, c.id, c.max), recent: recent.length ? avgOf(recent, c.id, c.max) : null }));

  const ratingMap = new Map(ratings.map((r) => [r.subtopic_id as string, { rating: Number(r.rating), attempts: r.attempts as number }]));
  const weakest = weakestSubtopics(ratingMap).map((id) => ({ id, name: SUB_NAME.get(id) ?? id, rating: Math.round(ratingMap.get(id)!.rating) }));

  const planByDay = new Map(plans.map((p) => [p.day_no, p.status]));
  const heatmap = Array.from({ length: settings.phases.totalDays }, (_, i) => {
    const day = i + 1;
    const kind = dayKind(day, settings.phases);
    const st = planByDay.get(day);
    const status: Analytics["heatmap"][number]["status"] =
      day > todayNo ? "future" : st === "completed" ? "completed" : kind === "rest" || kind === "exam" ? "free" : day === todayNo ? "today" : st && st !== "pending" ? "partial" : "missed";
    return { day, date: dateForDay(day, settings.phases.startDate), status };
  });

  const readinessSeries = mocks.filter((m) => m.readiness !== null).map((m) => ({ label: fmt.format(new Date(`${istDay(m.submitted_at as string)}T00:00:00Z`)), readiness: Number(m.readiness) }));
  const readiness = await readinessP;
  const streak = currentStreak(completed, todayNo, freeDays);
  const itemsSolved = attempts.length;

  // Badges: real milestones only.
  const hwByDay = new Map<number, { done: number; total: number }>();
  for (const h of hw) {
    const v = hwByDay.get(h.day_no as number) ?? { done: 0, total: 0 };
    v.total++;
    if (h.status === "done") v.done++;
    hwByDay.set(h.day_no as number, v);
  }
  let perfectHomeworkWeek = false;
  for (let d = 7; d <= todayNo; d++) {
    const week = Array.from({ length: 7 }, (_, k) => hwByDay.get(d - k));
    if (week.every((w) => w && w.total > 0 && w.done === w.total)) perfectHomeworkWeek = true;
  }
  const badges = [
    { id: "first-day", label: "First day completed", earned: completed.size >= 1 },
    { id: "streak-7", label: "7-day streak", earned: streak >= 7 || hasRun(completed, freeDays, 7) },
    { id: "streak-30", label: "30-day streak", earned: hasRun(completed, freeDays, 30) },
    { id: "first-mock", label: "First full mock", earned: mocks.some((m) => (m.mocks as unknown as { format: string })?.format === "2026") },
    { id: "sheets-25", label: "25 studio sheets", earned: subs.length >= 25 },
    { id: "sheets-100", label: "100 studio sheets", earned: subs.length >= 100 },
    { id: "items-1000", label: "1,000 questions", earned: itemsSolved >= 1000 },
    { id: "homework-week", label: "Perfect homework week", earned: perfectHomeworkWeek },
    { id: "sketch-21", label: "21-day sketch streak", earned: sketchStreak >= 21 },
  ];

  return {
    todayNo, streak, sketchStreak, daysCompleted: completed.size, itemsSolved, studioSheets: subs.length, mocksDone: mocks.length,
    accuracyTrend, categoryRadar, rubric, readiness, readinessSeries, target: settings.phases.targetReadiness, weakest, heatmap,
    wellbeing: reflections.map((r) => ({ day: r.day_no as number, mood: r.mood as number | null, energy: r.energy as number | null, sleep: r.sleep_hours === null ? null : Number(r.sleep_hours) })).reverse(),
    badges,
  };
}

function hasRun(completed: Set<number>, free: Set<number>, n: number): boolean {
  let run = 0;
  const max = Math.max(0, ...completed);
  for (let d = 1; d <= max; d++) {
    if (completed.has(d)) run++;
    else if (!free.has(d)) run = 0;
    if (run >= n) return true;
  }
  return false;
}

export interface Alert {
  level: "warn" | "bad";
  text: string;
}

/** Mentor alerts: missed days, short sleep, falling accuracy. */
export function alertsFor(a: Analytics): Alert[] {
  const out: Alert[] = [];
  const past = a.heatmap.filter((h) => h.day < a.todayNo && h.status !== "free");
  const lastTwo = past.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((h) => h.status === "missed")) out.push({ level: "bad", text: "Veeru missed the last 2 days in a row." });
  const sleeps = a.wellbeing.slice(-3).map((w) => w.sleep);
  if (sleeps.length === 3 && sleeps.every((s) => s !== null && s < 6)) out.push({ level: "bad", text: "Less than 6 hours of sleep for 3 nights running." });
  const acc = a.accuracyTrend.filter((t) => t.accuracy !== null).slice(-4).map((t) => t.accuracy!);
  if (acc.length === 4 && acc[1]! < acc[0]! && acc[2]! < acc[1]! && acc[3]! < acc[2]!) out.push({ level: "warn", text: `Accuracy has dropped 3 days in a row (${acc.join("% → ")}%).` });
  const moods = a.wellbeing.slice(-3).map((w) => w.mood);
  if (moods.length === 3 && moods.every((m) => m !== null && m <= 2)) out.push({ level: "warn", text: "Low mood logged 3 days running. Worth a chat." });
  return out;
}
