"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { recordAttempts } from "@/lib/data/attempts";
import { refreshDay } from "@/lib/data/day";
import { fetchAll } from "@/lib/data/fetch";
import { computeReadiness, getMock, mockScore, type MockAnswers } from "@/lib/data/mocks";
import { getPlanById } from "@/lib/data/plan";
import { dayNumberFor, istDateString } from "@/lib/plan/calendar";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Fresh questions for an objective section, like the exam's mix: about a third visual reasoning
 * (puzzles), up to a fifth picture questions (only photos already uploaded), the rest spread over
 * design, colour, drawing, crafts, global design and GK. Picked questions count as seen.
 */
async function pickObjectiveItems(db: Awaited<ReturnType<typeof supabaseServer>>, userId: string, count: number): Promise<string[]> {
  const [served, ready, cands] = await Promise.all([
    fetchAll<{ item_id: string }>(() => db.from("served_items").select("item_id").eq("user_id", userId).order("item_id")),
    fetchAll<{ id: string }>(() => db.from("images").select("id").eq("status", "ready").order("id")),
    fetchAll<{ id: string; category_id: string; image_ids: string[] }>(() => db.from("items").select("id,category_id,image_ids").eq("status", "live").neq("type", "short").order("id")),
  ]);
  const seen = new Set(served.map((s) => s.item_id));
  const photos = new Set(ready.map((r) => r.id));
  const fresh = cands.filter((c) => !seen.has(c.id) && c.image_ids.every((i) => photos.has(i))).sort(() => Math.random() - 0.5);
  const pick: string[] = [];
  const take = (list: typeof fresh, n: number) => { for (const c of list) { if (n <= 0 || pick.length >= count) break; if (!pick.includes(c.id)) { pick.push(c.id); n--; } } };
  take(fresh.filter((c) => c.image_ids.length), Math.round(count * 0.2));
  take(fresh.filter((c) => c.category_id === "visual" && !c.image_ids.length), Math.round(count * 0.35));
  // The rest: round-robin over the other categories so no area dominates.
  const byCat = new Map<string, string[]>();
  for (const c of fresh) if (!pick.includes(c.id) && c.category_id !== "visual") byCat.set(c.category_id, [...(byCat.get(c.category_id) ?? []), c.id]);
  while (pick.length < count && [...byCat.values()].some((l) => l.length)) for (const l of byCat.values()) if (l.length && pick.length < count) pick.push(l.shift()!);
  take(fresh, count - pick.length); // top up from anything left
  const order = pick.sort(() => Math.random() - 0.5);
  if (order.length) await db.from("served_items").upsert(order.map((id) => ({ user_id: userId, item_id: id, context: "mock" })), { onConflict: "user_id,item_id", ignoreDuplicates: true });
  return order;
}

export async function startMock(mockId: string, mode: "screen" | "paper") {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const mock = await getMock(db, z.string().max(60).parse(mockId));
  if (!mock) throw new Error("Mock not found");
  const { data: open } = await db.from("mock_attempts").select("id").eq("user_id", viewer.id).eq("mock_id", mock.id).is("submitted_at", null).maybeSingle();
  if (open) redirect(`/mocks/attempt/${open.id}`);

  const answers: MockAnswers = { uploads: {} };
  const objective = mock.questions.find((q) => q.kind === "objective");
  if (objective) answers.objectiveItemIds = await pickObjectiveItems(db, viewer.id, objective.count ?? 30);
  const { data, error } = await db.from("mock_attempts").insert({ user_id: viewer.id, mock_id: mock.id, mode, answers }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/mocks/attempt/${data.id}`);
}

const progressSchema = z.object({
  attemptId: z.string().uuid(),
  timeSplit: z.record(z.string(), z.number().min(0).max(4 * 3600)),
  uploads: z.record(z.string(), z.array(z.string().max(200)).max(10)),
  objective: z.record(z.string(), z.union([z.string().max(10), z.array(z.string().max(10)), z.null()])),
  pausedMs: z.number().int().min(0).max(24 * 3600_000).optional(),
});

export async function saveMockProgress(raw: unknown): Promise<{ ok: boolean }> {
  const p = progressSchema.safeParse(raw);
  if (!p.success) return { ok: false };
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data: att } = await db.from("mock_attempts").select("answers,submitted_at").eq("id", p.data.attemptId).eq("user_id", viewer.id).single();
  if (!att || att.submitted_at) return { ok: false };
  const paths = Object.values(p.data.uploads).flat();
  if (!paths.every((x) => x.startsWith(`${viewer.id}/mock-${p.data.attemptId}/`))) return { ok: false };
  const prev = att.answers as MockAnswers;
  // Paused time only grows, so a stale autosave can't give back minutes.
  const pausedMs = Math.max(prev.pausedMs ?? 0, p.data.pausedMs ?? 0);
  const answers = { ...prev, uploads: p.data.uploads, objective: p.data.objective, pausedMs };
  await db.from("mock_attempts").update({ answers, time_split: p.data.timeSplit }).eq("id", p.data.attemptId);
  return { ok: true };
}

export async function submitMock(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = progressSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Couldn't read your answers. Try again." };
  const d = parsed.data;
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const saved = await saveMockProgress(d);
  if (!saved.ok) return { ok: false, error: "This attempt was already submitted." };
  const { data: att } = await db.from("mock_attempts").select("mock_id,answers").eq("id", d.attemptId).single();
  const mock = await getMock(db, att!.mock_id as string);
  if (!mock) return { ok: false, error: "Mock not found" };
  const answers = att!.answers as MockAnswers;

  // Objective part: grade, log attempts (mistakes become homework).
  const today = istDateString(new Date());
  const settings = await loadSettings();
  const todayNo = dayNumberFor(today, settings.phases.startDate);
  const obj = mock.questions.find((q) => q.kind === "objective");
  if (obj && answers.objectiveItemIds?.length) {
    const res = await recordAttempts(
      db,
      answers.objectiveItemIds.map((id) => ({ itemId: id, answer: d.objective[id] ?? null, confidence: null, timeMs: 0, clientId: `mock:${d.attemptId}:${id}` })),
      { userId: viewer.id, planId: null, context: "mock", dayNo: todayNo, today, makeHomework: true },
    );
    answers.objectiveMarks = Math.round((res.filter((r) => r.correct).length / answers.objectiveItemIds.length) * obj.marks * 10) / 10;
  }
  const score = mockScore(mock, answers);

  // Each drawing answer also goes to GB's review queue.
  const subs = mock.questions
    .filter((q) => q.kind === "drawing" && (answers.uploads?.[q.no] ?? []).length)
    .map((q) => ({
      user_id: viewer.id, mock_attempt_id: d.attemptId, question_no: q.no, context: "mock", image_paths: answers.uploads![q.no]!,
      time_limit_s: q.suggestedMinutes * 60, time_used_s: Math.round(d.timeSplit[q.no] ?? 0), final_score: null, // set when GB marks it
    }));
  if (subs.length) await db.from("studio_submissions").insert(subs);

  await db.from("mock_attempts").update({ answers, submitted_at: new Date().toISOString(), est_score: score.total }).eq("id", d.attemptId);
  const ready = await computeReadiness(db, viewer.id);
  await db.from("mock_attempts").update({ readiness: ready }).eq("id", d.attemptId);

  const { data: plan } = await db.from("daily_plans").select("id").eq("user_id", viewer.id).eq("mock_id", mock.id).maybeSingle();
  if (plan) {
    const p = await getPlanById(db, plan.id as string);
    if (p) await refreshDay(db, p, settings);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
