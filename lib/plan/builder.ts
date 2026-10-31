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
  /** "PYQ" for real previous-year questions imported by the mentor. */
  source?: string;
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
  /** Items seen long enough ago to come back as labelled review when a category runs dry. */
  reviewable?: Set<string>;
  /** Length of the plan, for pacing new questions so no category runs out early. */
  totalDays?: number;
}

export interface BuiltPlan {
  warmup: string[];
  quick: string[];
  short: string[];
  /** Quick items that are repeats, shown with a "Review" label. */
  review: string[];
  studioTest: string[];
  dailyTask: string | null;
  tipId: string | null;
}

/** Share of the quick section per category (renormalised over what's available). */
const CATEGORY_WEIGHTS: Record<string, number> = {
  visual: 0.36, design: 0.15, colour: 0.1, drawing: 0.09, indian: 0.11, global: 0.09, gk: 0.07, creative: 0.03,
};

export const WARMUP_SIZE = 5;

/** Mirror and water images are the most common puzzle type; keep them to a few a day. */
const REFLECTION = new Set(["mirror-image", "water-image"]);
const MAX_REFLECTION_PER_TEST = 2;
/** No single puzzle type or subtopic should fill a category's share. */
const MAX_PER_KIND = 2;
/** Real previous-year questions (when imported) go in first, a few a day. */
const PYQ_PER_DAY = 3;

/** What makes two questions "the same kind": the puzzle generator, else the subtopic. */
export const kindOf = (i: PoolItem) => i.generator ?? i.subtopic;

/**
 * Take up to n items rotating across kinds (one of each kind per round, in random kind order),
 * at most maxPerKind of any kind and at most `reflectionLeft.n` mirror/water images overall.
 */
export function takeVaried(
  list: PoolItem[], n: number, rng: Rng, take: (l: PoolItem[], n: number) => PoolItem[],
  opts: { maxPerKind: number; reflectionLeft: { n: number }; used?: Map<string, number> },
): PoolItem[] {
  const groups = new Map<string, PoolItem[]>();
  for (const i of list) groups.set(kindOf(i), [...(groups.get(kindOf(i)) ?? []), i]);
  // Shared across calls when given, so a kind's cap holds for the whole test.
  const used = opts.used ?? new Map<string, number>();
  const out: PoolItem[] = [];
  let progressed = true;
  while (out.length < n && progressed) {
    progressed = false;
    for (const [kind, items] of rng.shuffle([...groups.entries()])) {
      if (out.length >= n) break;
      if ((used.get(kind) ?? 0) >= opts.maxPerKind) continue;
      if (REFLECTION.has(kind) && opts.reflectionLeft.n <= 0) continue;
      const got = take(items, 1);
      if (!got.length) continue;
      out.push(...got);
      used.set(kind, (used.get(kind) ?? 0) + 1);
      if (REFLECTION.has(kind)) opts.reflectionLeft.n--;
      progressed = true;
    }
  }
  return out;
}

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

  // Warm-up: five different kinds of visual puzzle, at most one mirror/water image.
  const warmup = takeVaried(ranked(available.filter((i) => i.generator && i.category === "visual")), WARMUP_SIZE, rng, take, { maxPerKind: 1, reflectionLeft: { n: 1 } });
  const reflectionLeft = { n: MAX_REFLECTION_PER_TEST };
  const kindCount = new Map<string, number>();

  const { quick: nQuick, short: nShort, studio: nStudio } = input.mockDay ? { quick: 0, short: 0, studio: 0 } : input.phase.mix;

  // Quick section: real previous-year questions first, weak subtopics next, then every category
  // gets its share, rotating across topics and puzzle types inside each category.
  const quickPool = available.filter((i) => i.type !== "short");
  const quick: PoolItem[] = [];
  if (nQuick) quick.push(...take(rng.shuffle(quickPool.filter((i) => i.source === "PYQ")), Math.min(PYQ_PER_DAY, nQuick)));
  for (const weak of weakestSubtopics(input.ratings)) {
    const weakItems = ranked(quickPool.filter((i) => i.subtopic === weak && !(REFLECTION.has(kindOf(i)) && reflectionLeft.n <= 0)));
    const got = take(weakItems, Math.min(2, nQuick - quick.length));
    reflectionLeft.n -= got.filter((i) => REFLECTION.has(kindOf(i))).length;
    for (const i of got) kindCount.set(kindOf(i), (kindCount.get(kindOf(i)) ?? 0) + 1);
    quick.push(...got);
  }
  const byCat = new Map<string, PoolItem[]>();
  for (const item of ranked(quickPool)) byCat.set(item.category, [...(byCat.get(item.category) ?? []), item]);
  const remaining = nQuick - quick.length;
  // Pace new questions over the remaining days; when a category's new ones are rationed or used
  // up, bring back ones seen 2+ weeks ago as labelled review, so every category appears every day.
  const daysLeft = Math.max(1, (input.totalDays ?? 100) - input.dayNo + 1);
  const reviewByCat = new Map<string, PoolItem[]>();
  for (const item of rng.shuffle(input.pool.filter((i) => i.type !== "short" && input.reviewable?.has(i.id)))) {
    reviewByCat.set(item.category, [...(reviewByCat.get(item.category) ?? []), item]);
  }
  const allCats = [...new Set([...byCat.keys(), ...reviewByCat.keys()])];
  const review: PoolItem[] = [];
  const weightSumAll = allCats.reduce((s, c) => s + (CATEGORY_WEIGHTS[c] ?? 0.03), 0);
  for (const c of allCats) {
    // Every category appears every day (at least one question).
    const quota = Math.min(Math.max(1, Math.round((remaining * (CATEGORY_WEIGHTS[c] ?? 0.03)) / weightSumAll)), nQuick - quick.length);
    if (quota <= 0) break;
    const fresh = byCat.get(c) ?? [];
    const paced = Math.max(1, Math.ceil((fresh.length / daysLeft) * 1.5));
    const got = takeVaried(fresh, Math.min(quota, paced), rng, take, { maxPerKind: MAX_PER_KIND, reflectionLeft, used: kindCount });
    if (got.length < quota) {
      const again = takeVaried(reviewByCat.get(c) ?? [], quota - got.length, rng, take, { maxPerKind: MAX_PER_KIND, reflectionLeft, used: kindCount });
      review.push(...again);
      got.push(...again);
    }
    if (got.length < quota) got.push(...takeVaried(fresh, quota - got.length, rng, take, { maxPerKind: MAX_PER_KIND + 1, reflectionLeft, used: kindCount }));
    quick.push(...got);
  }
  // Top up if quotas fell short: still varied, then anything left.
  if (quick.length < nQuick) quick.push(...takeVaried(ranked(quickPool), nQuick - quick.length, rng, take, { maxPerKind: MAX_PER_KIND + 1, reflectionLeft, used: kindCount }));
  if (quick.length < nQuick) quick.push(...take(ranked(quickPool.filter((i) => !REFLECTION.has(kindOf(i)))), nQuick - quick.length));

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
    if (deficit > 0) quick.push(...takeVaried(ranked(quickPool), deficit, rng, take, { maxPerKind: MAX_PER_KIND + 1, reflectionLeft, used: kindCount }));
  }

  const tipCands = input.tips.filter((t) => !input.usedTips.has(t.id));
  const tip = rng.shuffle(tipCands.filter((t) => t.phases.includes(phaseId)))[0] ?? rng.shuffle(tipCands)[0] ?? null;

  return {
    warmup: warmup.map((i) => i.id),
    quick: interleaveByCategory(rng.shuffle(quick)).map((i) => i.id),
    short: short.map((i) => i.id),
    review: review.map((i) => i.id),
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
