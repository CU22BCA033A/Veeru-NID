import { describe, expect, it } from "vitest";
import { calibrationGap, finalPercent, percent, timeScore, RUBRIC_TOTAL } from "@/lib/studio/rubric";

describe("studio rubric", () => {
  it("totals 60 points", () => expect(RUBRIC_TOTAL).toBe(60));
  it("scores time", () => {
    expect(timeScore(600, 900)).toBe(5);
    expect(timeScore(980, 900)).toBe(4);
    expect(timeScore(2000, 900)).toBe(1);
  });
  it("computes percentages and precedence", () => {
    const self = { idea: 8, brief: 8, communication: 8, drawing: 8, composition: 8, labels: 4, time: 4 };
    expect(percent(self)).toBe(80);
    expect(finalPercent({ self, mentor: { idea: 5, brief: 5, communication: 5, drawing: 5, composition: 5, labels: 2.5, time: 2.5 } })).toBe(50);
    expect(calibrationGap(self, { idea: 6, brief: 6, communication: 6, drawing: 6, composition: 6, labels: 3, time: 3 })).toBe(20);
  });
});
