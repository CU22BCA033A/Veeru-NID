import { describe, expect, it } from "vitest";
import { grade, gradeShort, splitIdeas } from "@/lib/scoring/grade";
import { expectedSuccess, updateRating } from "@/lib/rating/elo";

describe("grading", () => {
  it("mcq and multi", () => {
    expect(grade({ type: "mcq", answer: "b" }, "b").correct).toBe(true);
    expect(grade({ type: "mcq", answer: "b" }, "a").score).toBe(0);
    expect(grade({ type: "multi", answer: ["a", "c"] }, ["c", "a"]).correct).toBe(true);
    expect(grade({ type: "multi", answer: ["a", "c"] }, ["a"]).score).toBe(0.25);
    expect(grade({ type: "multi", answer: ["a", "c"] }, ["a", "b", "d"]).score).toBe(0);
    expect(grade({ type: "mcq", answer: "b" }, null).correct).toBe(false);
  });

  it("splits ideas from lists", () => {
    expect(splitIdeas("1. a hat stand\n2. a shelf for pots\n3) plant support")).toHaveLength(3);
  });

  it("short answers reward ideas and vocabulary", () => {
    const rubric = { keywords: ["shelf", "stand", "rack"], minIdeas: 4 };
    const good = gradeShort("1. shelf for books\n2. stand for a lamp\n3. drying rack for clothes\n4. hurdle for kids games", rubric);
    const weak = gradeShort("sit on it", rubric);
    expect(good.correct).toBe(true);
    expect(weak.correct).toBe(false);
  });
});

describe("elo", () => {
  it("moves ratings in the right direction", () => {
    expect(updateRating(1000, 0, 3, 1)).toBeGreaterThan(1000);
    expect(updateRating(1000, 0, 3, 0)).toBeLessThan(1000);
    expect(expectedSuccess(1000, 1)).toBeGreaterThan(expectedSuccess(1000, 5));
  });
});
