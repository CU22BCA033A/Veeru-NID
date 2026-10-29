import { describe, expect, it } from "vitest";
import { finalPercent, percent, timeScore, RUBRIC_TOTAL } from "@/lib/studio/rubric";

describe("studio rubric", () => {
  it("totals 60 points", () => expect(RUBRIC_TOTAL).toBe(60));
  it("scores time", () => {
    expect(timeScore(600, 900)).toBe(5);
    expect(timeScore(980, 900)).toBe(4);
    expect(timeScore(2000, 900)).toBe(1);
  });
  it("computes percentages; GB's marks win over the AI estimate", () => {
    const ai = { idea: 8, brief: 8, communication: 8, drawing: 8, composition: 8, labels: 4, time: 4 };
    expect(percent(ai)).toBe(80);
    expect(finalPercent({ ai })).toBe(80);
    expect(finalPercent({ ai, mentor: { idea: 5, brief: 5, communication: 5, drawing: 5, composition: 5, labels: 2.5, time: 2.5 } })).toBe(50);
  });
  it("has no score until GB or the AI has marked it", () => expect(finalPercent({})).toBeNull());
});
