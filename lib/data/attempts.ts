import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttemptInput } from "@/lib/items/types";
import { pickVariants } from "@/lib/plan/variants";
import type { PoolItem } from "@/lib/plan/builder";
import { updateRating, START_RATING } from "@/lib/rating/elo";
import { grade } from "@/lib/scoring/grade";
import { addDays } from "@/lib/plan/calendar";
import { getItems, type FullItem } from "./items";
import { fetchAll } from "./fetch";

export const SRS_OFFSETS = [1, 3, 7, 16]; // days after the miss

export interface RecordOptions {
  userId: string;
  planId: string | null;
  context: "warmup" | "daily" | "homework" | "drill" | "review" | "mock";
  dayNo: number;
  today: string; // YYYY-MM-DD (IST)
  makeHomework: boolean;
}

/** Grade, store attempts, update skill ratings, and (for tests/drills) create homework + SRS cards. */
export async function recordAttempts(db: SupabaseClient, attempts: AttemptInput[], opts: RecordOptions) {
  const items = await getItems(db, attempts.map((a) => a.itemId));
  const byId = new Map(items.map((i) => [i.id, i]));
  const graded = attempts
    .filter((a) => byId.has(a.itemId))
    .map((a) => {
      const item = byId.get(a.itemId)!;
      const g = grade({ type: item.type, answer: item.answer, rubric: item.rubric }, a.answer);
      const answered = !(a.answer === null || a.answer === "" || (Array.isArray(a.answer) && !a.answer.length));
      return { a, item, g, answered };
    });

  const rows = graded.map(({ a, item, g, answered }) => ({
    user_id: opts.userId, item_id: item.id, plan_id: opts.planId, context: opts.context,
    answer: a.answer, correct: answered ? g.correct : false, score: answered ? g.score : 0,
    confidence: a.confidence, time_ms: Math.min(a.timeMs, 60 * 60 * 1000), client_id: a.clientId,
  }));
  if (rows.length) {
    const { error } = await db.from("attempts").upsert(rows, { onConflict: "client_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  // Skill ratings per subtopic.
  const answered = graded.filter((g) => g.answered);
  const subs = [...new Set(answered.map((g) => g.item.subtopic_id))];
  if (subs.length) {
    const { data: current } = await db.from("skill_ratings").select("subtopic_id,rating,attempts").eq("user_id", opts.userId).in("subtopic_id", subs);
    const map = new Map((current ?? []).map((r) => [r.subtopic_id as string, { rating: Number(r.rating), attempts: r.attempts as number }]));
    for (const { item, g } of answered) {
      const r = map.get(item.subtopic_id) ?? { rating: START_RATING, attempts: 0 };
      map.set(item.subtopic_id, { rating: updateRating(r.rating, r.attempts, item.difficulty, g.score), attempts: r.attempts + 1 });
    }
    await db.from("skill_ratings").upsert(
      [...map.entries()].filter(([s]) => subs.includes(s)).map(([s, r]) => ({ user_id: opts.userId, subtopic_id: s, rating: r.rating, attempts: r.attempts, updated_at: new Date().toISOString() })),
    );
  }

  // Wrong answers (or lucky guesses) → homework: re-attempt + 2 fresh variants; SRS card.
  const wrong = graded.filter(({ g, a }) => !g.correct || a.confidence === "guess");
  if (opts.makeHomework && wrong.length) await createHomework(db, opts, wrong.map((w) => w.item), graded);

  return graded.map(({ item, g, answered: ans }) => ({ itemId: item.id, correct: ans && g.correct, score: ans ? g.score : 0 }));
}

async function createHomework(
  db: SupabaseClient,
  opts: RecordOptions,
  wrongItems: FullItem[],
  graded: { a: AttemptInput; item: FullItem; g: { correct: boolean } }[],
) {
  const served = new Set(
    (await fetchAll<{ item_id: string }>(() => db.from("served_items").select("item_id").eq("user_id", opts.userId).order("item_id"))).map((s) => s.item_id),
  );
  const homework: { user_id: string; day_no: number; item_id: string; kind: string; source_attempt_id: null }[] = [];
  const newlyServed: string[] = [];
  for (const item of wrongItems) {
    const genuinelyWrong = !graded.find((g) => g.item.id === item.id)?.g.correct;
    if (genuinelyWrong) homework.push({ user_id: opts.userId, day_no: opts.dayNo, item_id: item.id, kind: "reattempt", source_attempt_id: null });
    // candidates: same generator, or same subtopic and type
    const query = item.generator
      ? db.from("items").select("id,type,subtopic_id,category_id,difficulty,generator,image_ids").eq("status", "live").eq("generator", item.generator).limit(300)
      : db.from("items").select("id,type,subtopic_id,category_id,difficulty,generator,image_ids").eq("status", "live").eq("subtopic_id", item.subtopic_id).limit(300);
    const { data } = await query;
    const pool: PoolItem[] = (data ?? [])
      .filter((r) => (r.image_ids as string[]).length === 0 || r.id === item.id) // keep photo variants simple: only image-free ones
      .map((r) => ({ id: r.id as string, type: r.type as PoolItem["type"], subtopic: r.subtopic_id as string, category: r.category_id as string, difficulty: r.difficulty as number, generator: r.generator as string | null }));
    const src: PoolItem = { id: item.id, type: item.type, subtopic: item.subtopic_id, category: item.category_id, difficulty: item.difficulty, generator: item.generator };
    for (const v of pickVariants(src, pool, served, genuinelyWrong ? 2 : 1)) {
      served.add(v.id);
      newlyServed.push(v.id);
      homework.push({ user_id: opts.userId, day_no: opts.dayNo, item_id: v.id, kind: "variant", source_attempt_id: null });
    }
  }
  if (homework.length) await db.from("homework").upsert(homework, { onConflict: "user_id,day_no,item_id", ignoreDuplicates: true });
  if (newlyServed.length) {
    await db.from("served_items").upsert(newlyServed.map((id) => ({ user_id: opts.userId, item_id: id, context: "homework" })), { onConflict: "user_id,item_id", ignoreDuplicates: true });
  }
  await db.from("srs_cards").upsert(
    wrongItems.map((i) => ({ user_id: opts.userId, item_id: i.id, step: 0, due: addDays(opts.today, SRS_OFFSETS[0]!), lapses: 1, retired: false })),
    { onConflict: "user_id,item_id" },
  );
}

/** After a review attempt: move the card along 1 → 3 → 7 → 16 days, or reset on a miss. */
export async function updateSrs(db: SupabaseClient, userId: string, itemId: string, correct: boolean, today: string) {
  const { data: card } = await db.from("srs_cards").select("step,lapses").eq("user_id", userId).eq("item_id", itemId).maybeSingle();
  if (!card) return;
  if (!correct) {
    await db.from("srs_cards").update({ step: 0, lapses: (card.lapses as number) + 1, due: addDays(today, 1), last_reviewed_at: new Date().toISOString() }).eq("user_id", userId).eq("item_id", itemId);
    return;
  }
  const step = (card.step as number) + 1;
  const retired = step >= SRS_OFFSETS.length;
  const gap = retired ? 0 : SRS_OFFSETS[step]! - SRS_OFFSETS[step - 1]!;
  await db.from("srs_cards").update({ step, retired, due: addDays(today, Math.max(1, gap)), last_reviewed_at: new Date().toISOString() }).eq("user_id", userId).eq("item_id", itemId);
}
