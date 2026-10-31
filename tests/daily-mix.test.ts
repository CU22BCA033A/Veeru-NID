import { describe, expect, it } from "vitest";
import { defaultPhases } from "@/lib/config/defaults";
import { loadAuthoredItems, SUBTOPICS } from "@/lib/content/load";
import { buildGeneratedPool } from "@/lib/generators";
import { buildDay, kindOf, type PoolItem, type Rating } from "@/lib/plan/builder";
import { dayKind, phaseForDay } from "@/lib/plan/calendar";
import { loadStudioTasks, loadTips } from "@/lib/seed/extra";

/** Veeru said one day felt like "only one type of question". Every day must be a mix. */
describe("daily test mix", () => {
  const generated = buildGeneratedPool();
  const authored = loadAuthoredItems().filter((a) => !a.imageIds.length);
  const pool: PoolItem[] = [
    ...generated.map((g) => ({ id: g.id, type: "mcq" as const, subtopic: g.subtopic, category: SUBTOPICS.get(g.subtopic)!, difficulty: g.difficulty, generator: g.generator })),
    ...authored.map((a) => ({ id: a.id, type: a.type, subtopic: a.subtopic, category: SUBTOPICS.get(a.subtopic)!, difficulty: a.difficulty, generator: null, source: a.source })),
  ];
  pool.push({ id: "pyq-1", type: "mcq", subtopic: "colour.wheel", category: "colour", difficulty: 2, generator: null, source: "PYQ" });
  const byId = new Map(pool.map((p) => [p.id, p]));
  const studio = loadStudioTasks().map((t) => ({ id: t.id, kind: t.kind, phases: t.phases, category: t.category }));
  const tips = loadTips();
  const reflection = (id: string) => ["mirror-image", "water-image"].includes(kindOf(byId.get(id)!));

  it("covers every category, varies puzzle types, keeps mirror/water images rare, and puts PYQs in", () => {
    const served = new Set<string>();
    const servedDay = new Map<string, number>();
    const ratings = new Map<string, Rating>();
    const categories = new Set(pool.filter((p) => p.type !== "short").map((p) => p.category));
    let pyqSeen = false;
    for (let day = 1; day <= defaultPhases.totalDays; day++) {
      if (dayKind(day, defaultPhases) !== "study") continue;
      const phase = phaseForDay(day, defaultPhases)!;
      if (phase.mix.quick < 20) continue; // board-exam phases are short; the mix rule is for full tests
      const reviewable = new Set([...servedDay].filter(([, d]) => day - d >= 14).map(([id]) => id));
      const plan = buildDay({ dayNo: day, phase, pool, served, ratings, studioPool: studio, usedStudio: new Set(), tips, usedTips: new Set(), seed: day * 7919, reviewable, totalDays: defaultPhases.totalDays });
      const quick = plan.quick.map((id) => byId.get(id)!);

      const cats = new Set(quick.map((q) => q.category));
      for (const c of categories) expect(cats.has(c), `day ${day} has no ${c} question`).toBe(true);

      expect(plan.quick.filter(reflection).length, `day ${day} mirror/water in test`).toBeLessThanOrEqual(2);
      expect(plan.warmup.filter(reflection).length, `day ${day} mirror/water in warm-up`).toBeLessThanOrEqual(1);
      expect(new Set(plan.warmup.map((id) => kindOf(byId.get(id)!))).size, `day ${day} warm-up kinds`).toBe(plan.warmup.length);

      const kinds = new Map<string, number>();
      for (const q of quick) kinds.set(kindOf(q), (kinds.get(kindOf(q)) ?? 0) + 1);
      const most = Math.max(...kinds.values());
      expect(most, `day ${day}: one kind appears ${most} times: ${[...kinds].filter(([, n]) => n === most).map(([k]) => k).join(",")} of ${quick.length}`).toBeLessThanOrEqual(3);

      if (plan.quick.includes("pyq-1")) pyqSeen = true;
      for (const id of [...plan.warmup, ...plan.quick, ...plan.short]) if (!served.has(id)) { served.add(id); servedDay.set(id, day); }
    }
    expect(pyqSeen, "imported PYQ was never used").toBe(true);
  });
});
