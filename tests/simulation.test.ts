import { describe, expect, it } from "vitest";
import { defaultPhases } from "@/lib/config/defaults";
import { loadAuthoredItems, SUBTOPICS } from "@/lib/content/load";
import { buildGeneratedPool } from "@/lib/generators";
import { buildDay, type PoolItem, type Rating } from "@/lib/plan/builder";
import { dayKind, phaseForDay } from "@/lib/plan/calendar";
import { loadStudioTasks, loadTips } from "@/lib/seed/extra";
import { Rng } from "@/lib/generators/rng";
import { updateRating } from "@/lib/rating/elo";
import { pickVariants } from "@/lib/plan/variants";

/** Simulate Veeru doing all 100 days, getting ~30% wrong (each wrong item spawns 2 variants). */
describe("100-day simulation", () => {
  const generated = buildGeneratedPool();
  const authored = loadAuthoredItems();
  const pool: PoolItem[] = [
    ...generated.map((g) => ({ id: g.id, type: "mcq" as const, subtopic: g.subtopic, category: SUBTOPICS.get(g.subtopic)!, difficulty: g.difficulty, generator: g.generator })),
    ...authored.map((a) => ({ id: a.id, type: a.type, subtopic: a.subtopic, category: SUBTOPICS.get(a.subtopic)!, difficulty: a.difficulty, generator: null })),
  ];
  const studio = loadStudioTasks().map((t) => ({ id: t.id, kind: t.kind, phases: t.phases, category: t.category }));
  const tips = loadTips();

  it("never repeats an item outside of labelled review, and meets daily minimums", () => {
    const served = new Set<string>();
    const ratings = new Map<string, Rating>();
    const usedStudio = new Set<string>();
    const usedTips = new Set<string>();
    const rng = new Rng(42);
    const shortfalls: string[] = [];
    for (let day = 1; day <= defaultPhases.totalDays; day++) {
      const kind = dayKind(day, defaultPhases);
      if (kind === "exam" || kind === "rest") continue;
      const phase = phaseForDay(day, defaultPhases)!;
      const plan = buildDay({ dayNo: day, phase, pool, served, ratings, studioPool: studio, usedStudio, tips, usedTips, seed: day * 7919, mockDay: kind === "mock" });
      const ids = [...plan.warmup, ...plan.quick, ...plan.short];
      for (const id of ids) {
        expect(served.has(id), `day ${day} repeated ${id}`).toBe(false);
        served.add(id);
      }
      plan.studioTest.forEach((t) => { expect(usedStudio.has(t)).toBe(false); usedStudio.add(t); });
      if (plan.dailyTask) usedStudio.add(plan.dailyTask);
      if (plan.tipId) usedTips.add(plan.tipId);
      if (kind !== "mock") {
        const total = plan.quick.length + plan.short.length + plan.studioTest.length;
        if (total < phase.minItems) shortfalls.push(`day ${day}: ${total}/${phase.minItems}`);
      }
      // answer, update ratings, spawn homework variants (which also count as served)
      for (const id of [...plan.quick, ...plan.short]) {
        const item = pool.find((p) => p.id === id)!;
        const right = rng.chance(0.7);
        const r = ratings.get(item.subtopic) ?? { rating: 1000, attempts: 0 };
        ratings.set(item.subtopic, { rating: updateRating(r.rating, r.attempts, item.difficulty, right ? 1 : 0), attempts: r.attempts + 1 });
        if (!right) for (const v of pickVariants(item, pool, served, 2)) served.add(v.id);
      }
    }
    expect(shortfalls, "days below the minimum item count").toEqual([]);
  });
});
