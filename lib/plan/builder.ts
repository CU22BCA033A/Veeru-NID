import type { Phase } from "@/lib/config/schemas";
import { expectedSuccess, START_RATING, TARGET_SUCCESS } from "@/lib/rating/elo";
import { Rng } from "@/lib/generators/rng";

export interface PoolItem {
  id: string;
  type: "mcq" | "multi" | "short";
  subtopic: string;
  category: string;
  difficulty: number;
  generator: string | null;
}

export interface StudioPoolTask {
  id: string;
  kind: "test" | "daily" | "mains";
  phases: string[];
  category: string;
}

export interface Rating {
  rating: number;
  attempts: number;
}

export interface BuildInput {
  dayNo: number;
  phase: Phase;
  pool: PoolItem[];
  served: Set<string>;
  ratings: Map<string, Rating>;
  studioPool: StudioPoolTask[];
  usedStudio: Set<string>;
  tips: { id: string; phases: string[] }[];
  usedTips: Set<string>;
  seed: number;
  mockDay?: boolean;
}

export interface BuiltPlan {
  warmup: string[];
  quick: string[];
  short: string[];
  studioTest: string[];
  dailyTask: string | null;
  tipId: string | null;
}

/** Share of the quick section per category (renormalised over what's available). */
const CATEGORY_WEIGHTS: Record<string, number> = {
  visual: 0.36, design: 0.15, colour: 0.1, drawing: 0.09, indian: 0.11, global: 0.09, gk: 0.07, creative: 0.03,
};

export const WARMUP_SIZE = 5;

/** The 3 weakest subtopics with enough evidence (≥3 attempts). */
export function weakestSubtopics(ratings: Map<string, Rating>, n = 3): string[] {
  return [...ratings.entries()]
    .filter(([, r]) => r.attempts >= 3)
    .sort((a, b) => a[1].rating - b[1].rating)
    .slice(0, n)
    .map(([s]) => s);
}

function score(item: PoolItem, ratings: Map<string, Rating>, rng: Rng): number {
  const skill = ratings.get(item.subtopic)?.rating ?? START_RATING;
  return -Math.abs(expectedSuccess(skill, item.difficulty) - TARGET_SUCCESS) + rng.next() * 0.15;
}

/**
 * Pick today's items. Never returns an item in `served`; interleaves categories; targets ~72%
 * expected success per subtopic; forces weak subtopics into rotation. Pure and deterministic.
 */
export function buildDay(input: BuildInput): BuiltPlan {
  const rng = new Rng(input.seed);
  const taken = new Set<string>();
  const available = input.pool.filter((i) => !input.served.has(i.id));
  const take = (list: PoolItem[], n: number): PoolItem[] => {
    const out: PoolItem[] = [];
    for (const item of list) {
      if (out.length >= n) break;
      if (taken.has(item.id)) continue;
      taken.add(item.id);
      out.push(item);
    }
    return out;
  };
  const ranked = (list: PoolItem[]) =>
    list.map((i) => ({ i, s: score(i, input.ratings, rng) })).sort((a, b) => b.s - a.s).map((x) => x.i);

  // Warm-up: quick generated visual puzzles.
  const warmup = take(ranked(available.filter((i) => i.generator && i.category === "visual")), input.mockDay ? WARMUP_SIZE : WARMUP_SIZE);

  const { quick: nQuick, short: nShort, studio: nStudio } = input.mockDay ? { quick: 0, short: 0, studio: 0 } : input.phase.mix;

  // Quick section: weak subtopics first, then weighted category quotas.
  const quickPool = available.filter((i) => i.type !== "short");
  const quick: PoolItem[] = [];
  for (const weak of weakestSubtopics(input.ratings)) {
    quick.push(...take(ranked(quickPool.filter((i) => i.subtopic === weak)), Math.min(2, nQuick - quick.length)));
  }
  const byCat = new Map<string, PoolItem[]>();
  for (const item of ranked(quickPool)) byCat.set(item.category, [...(byCat.get(item.category) ?? []), item]);
  const cats = [...byCat.keys()];
  const weightSum = cats.reduce((s, c) => s + (CATEGORY_WEIGHTS[c] ?? 0.03), 0);
  const remaining = nQuick - quick.length;
  for (const c of cats) {
    const quota = Math.round((remaining * (CATEGORY_WEIGHTS[c] ?? 0.03)) / weightSum);
    quick.push(...take(byCat.get(c)!, Math.min(quota, nQuick - quick.length)));
  }
  // Top up from whatever is left (any category) if quotas fell short.
  if (quick.length < nQuick) quick.push(...take(ranked(quickPool), nQuick - quick.length));

  const shortPool = ranked(available.filter((i) => i.type === "short"));
  // Spread short answers across subtopics.
  const shortBySub = new Map<string, PoolItem[]>();
  for (const s of shortPool) shortBySub.set(s.subtopic, [...(shortBySub.get(s.subtopic) ?? []), s]);
  const short: PoolItem[] = [];
  while (short.length < nShort && [...shortBySub.values()].some((l) => l.some((x) => !taken.has(x.id)))) {
    for (const list of rng.shuffle([...shortBySub.values()])) {
      if (short.length >= nShort) break;
      short.push(...take(list, 1));
    }
  }

  const phaseId = input.phase.id;
  // Tasks tagged for this phase first; once those run out, any unused task of the right kind.
  const studioFor = (kinds: string[]) => {
    const unused = input.studioPool.filter((t) => kinds.includes(t.kind) && !input.usedStudio.has(t.id));
    return [...rng.shuffle(unused.filter((t) => t.phases.includes(phaseId))), ...rng.shuffle(unused.filter((t) => !t.phases.includes(phaseId)))];
  };
  const testKinds = phaseId === "P5" ? ["mains", "test"] : phaseId === "P4" ? ["test", "daily"] : ["test"];
  const studioTest = interleaveByCategory(studioFor(testKinds).slice(0, Math.max(nStudio * 4, 8))).slice(0, nStudio).map((t) => t.id);
  const dailyKinds = phaseId === "P5" ? ["mains", "daily"] : ["daily"];
  let dailyCands = studioFor(dailyKinds).filter((t) => !studioTest.includes(t.id));
  // Last resort: a longer exam-style task as the day's challenge.
  if (!dailyCands.length) dailyCands = studioFor(["test", "mains", "daily"]).filter((t) => !studioTest.includes(t.id));
  const dailyTask = dailyCands[0]?.id ?? null;

  // Safety net: if short answers or studio tasks ran out, top up with quick items so the day
  // still reaches its minimum.
  if (!input.mockDay) {
    const deficit = input.phase.minItems - (quick.length + short.length + studioTest.length);
    if (deficit > 0) quick.push(...take(ranked(quickPool), deficit));
  }

  const tipCands = input.tips.filter((t) => !input.usedTips.has(t.id));
  const tip = rng.shuffle(tipCands.filter((t) => t.phases.includes(phaseId)))[0] ?? rng.shuffle(tipCands)[0] ?? null;

  return {
    warmup: warmup.map((i) => i.id),
    quick: interleaveByCategory(rng.shuffle(quick)).map((i) => i.id),
    short: short.map((i) => i.id),
    studioTest,
    dailyTask,
    tipId: tip?.id ?? null,
  };
}

/** Reorder so the same category rarely appears twice in a row (interleaving). */
export function interleaveByCategory<T extends { category: string }>(items: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const i of items) buckets.set(i.category, [...(buckets.get(i.category) ?? []), i]);
  const out: T[] = [];
  let last = "";
  while (out.length < items.length) {
    const options = [...buckets.entries()].filter(([, l]) => l.length).sort((a, b) => b[1].length - a[1].length);
    const pick = options.find(([c]) => c !== last) ?? options[0]!;
    out.push(pick[1].shift()!);
    last = pick[0];
  }
  return out;
}
