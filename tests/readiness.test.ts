import { describe, expect, it } from "vitest";
import { readiness } from "@/lib/scoring/readiness";

describe("readiness", () => {
  it("weights mocks highest and ignores missing parts", () => {
    expect(readiness({ mockPercents: [], studioPercents: [], dailyAccuracy: null, consistency: null }).score).toBeNull();
    expect(readiness({ mockPercents: [], studioPercents: [], dailyAccuracy: 80, consistency: null }).score).toBe(80);
    const r = readiness({ mockPercents: [60, 50, 40, 10], studioPercents: [70], dailyAccuracy: 80, consistency: 100 });
    // mocks avg of last 3 = 50
    expect(r.parts.mocks).toBe(50);
    expect(r.score).toBe(Math.round(50 * 0.45 + 70 * 0.25 + 80 * 0.15 + 100 * 0.15));
  });
});
