import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "./fetch";

/**
 * Drawing work is tracked apart from the question tests: drawing tasks can be finished on a later
 * day, and their score only exists once GB marks them.
 */
export interface PendingDrawing {
  dayNo: number;
  date: string;
  taskId: string;
  title: string;
  minutes: number;
  kind: "test" | "daily";
  href: string;
}

export interface DrawingSubmission {
  id: string;
  title: string;
  category: string | null;
  createdAt: string;
  context: string;
  score: number | null;
  marked: boolean;
  dayNo: number | null;
}

export interface DrawingRecord {
  pending: PendingDrawing[];
  waiting: DrawingSubmission[];
  marked: DrawingSubmission[];
  assigned: number;
  done: number;
  averageScore: number | null;
  recentScores: number[];
}

export async function loadDrawingRecord(db: SupabaseClient, userId: string, todayNo: number): Promise<DrawingRecord> {
  const [plans, subs] = await Promise.all([
    fetchAll<{ id: string; day_no: number; date: string; studio_task_ids: string[]; daily_task_id: string | null }>(() =>
      db.from("daily_plans").select("id,day_no,date,studio_task_ids,daily_task_id").eq("user_id", userId).lte("day_no", Math.max(todayNo, 0)).order("day_no"),
    ),
    fetchAll<{ id: string; task_id: string | null; plan_id: string | null; context: string; created_at: string; final_score: number | null; reviewed_at: string | null; studio_tasks: { title: string; category: string } | null }>(() =>
      db.from("studio_submissions").select("id,task_id,plan_id,context,created_at,final_score,reviewed_at,studio_tasks(title,category)").eq("user_id", userId).neq("context", "mock").order("created_at", { ascending: false }),
    ),
  ]);

  const doneKey = new Set(subs.map((s) => `${s.plan_id}:${s.task_id}`));
  const dailyDone = new Set(subs.filter((s) => s.context === "daily" || s.context === "mains").map((s) => s.plan_id));
  const wanted: { plan: (typeof plans)[number]; taskId: string; kind: "test" | "daily" }[] = [];
  let assigned = 0;
  for (const p of plans) {
    for (const t of p.studio_task_ids) {
      assigned++;
      if (!doneKey.has(`${p.id}:${t}`)) wanted.push({ plan: p, taskId: t, kind: "test" });
    }
    if (p.daily_task_id) {
      assigned++;
      if (!dailyDone.has(p.id)) wanted.push({ plan: p, taskId: p.daily_task_id, kind: "daily" });
    }
  }
  const taskIds = [...new Set(wanted.map((w) => w.taskId))];
  const { data: tasks } = taskIds.length ? await db.from("studio_tasks").select("id,title,minutes").in("id", taskIds) : { data: [] };
  const taskInfo = new Map((tasks ?? []).map((t) => [t.id as string, { title: t.title as string, minutes: t.minutes as number }]));
  const pending: PendingDrawing[] = wanted
    .map((w) => ({
      dayNo: w.plan.day_no,
      date: w.plan.date,
      taskId: w.taskId,
      title: taskInfo.get(w.taskId)?.title ?? "Drawing task",
      minutes: taskInfo.get(w.taskId)?.minutes ?? 30,
      kind: w.kind,
      href: `/studio/task/${w.taskId}?plan=${w.plan.id}&ctx=${w.kind}`,
    }))
    .sort((a, b) => b.dayNo - a.dayNo);

  const dayOfPlan = new Map(plans.map((p) => [p.id, p.day_no]));
  const rows: DrawingSubmission[] = subs.map((s) => ({
    id: s.id,
    title: s.studio_tasks?.title ?? "Drawing",
    category: s.studio_tasks?.category ?? null,
    createdAt: s.created_at,
    context: s.context,
    score: s.final_score === null ? null : Number(s.final_score),
    marked: Boolean(s.reviewed_at), // only GB's marks count; an AI estimate still waits for GB
    dayNo: s.plan_id ? dayOfPlan.get(s.plan_id) ?? null : null,
  }));
  const marked = rows.filter((r) => r.marked && r.score !== null);
  const scores = marked.map((r) => r.score!);
  return {
    pending,
    waiting: rows.filter((r) => !r.marked),
    marked,
    assigned,
    done: assigned - wanted.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    recentScores: scores.slice(0, 10).reverse(),
  };
}
