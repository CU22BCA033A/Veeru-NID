import { describe, expect, it } from "vitest";
import { analyseSpeech } from "@/lib/interview/analyse";

describe("speech analysis", () => {
  it("counts words, pace and fillers", () => {
    const s = analyseSpeech("Um I like design because um when I was small I noticed my grandmother's tiffin box", 10);
    expect(s.words).toBe(16);
    expect(s.wpm).toBe(96);
    expect(s.fillers.some((f) => f.word === "like")).toBe(false);
    expect(s.fillers.find((f) => f.word === "um")?.count).toBe(2);
    expect(s.tips.some((t) => t.includes("Too short"))).toBe(true);
  });
});
