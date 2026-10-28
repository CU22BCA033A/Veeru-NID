import { z } from "zod";

export const RUBRIC = [
  { id: "idea", label: "Idea & originality", max: 10, help: "Is the idea fresh, not the first thing everyone would draw?" },
  { id: "brief", label: "Understanding of the brief", max: 10, help: "Did you answer exactly what was asked, for the right user and context?" },
  { id: "communication", label: "Communication clarity", max: 10, help: "Would an examiner get it in 10 seconds?" },
  { id: "drawing", label: "Drawing skill", max: 10, help: "Proportion, perspective, line quality, light & shade." },
  { id: "composition", label: "Composition & use of space", max: 10, help: "Good size on the sheet, clear focal point, balance." },
  { id: "labels", label: "Labels, captions, word limits", max: 5, help: "Useful labels, captions within the limit, neat lettering." },
  { id: "time", label: "Time management", max: 5, help: "Calculated from your timer." },
] as const;

export type CriterionId = (typeof RUBRIC)[number]["id"];
export type Scores = Partial<Record<CriterionId, number>>;
export const RUBRIC_TOTAL = RUBRIC.reduce((s, c) => s + c.max, 0); // 60

export const scoresSchema = z.object(
  Object.fromEntries(RUBRIC.map((c) => [c.id, z.number().min(0).max(c.max).optional()])) as Record<CriterionId, z.ZodOptional<z.ZodNumber>>,
);

/** 5 = on time … 1 = far over. */
export function timeScore(usedS: number | null, limitS: number | null): number {
  if (!usedS || !limitS) return 3;
  const r = usedS / limitS;
  if (r <= 1.0) return 5;
  if (r <= 1.1) return 4;
  if (r <= 1.25) return 3;
  if (r <= 1.5) return 2;
  return 1;
}

/** Percentage (0–100) from rubric scores; missing criteria don't count against you. */
export function percent(scores: Scores | null | undefined): number | null {
  if (!scores) return null;
  let got = 0, max = 0;
  for (const c of RUBRIC) {
    const v = scores[c.id];
    if (typeof v === "number") {
      got += v;
      max += c.max;
    }
  }
  return max ? Math.round((got / max) * 100) : null;
}

/** Mentor score wins, then AI, then self. */
export function finalPercent(s: { self?: Scores | null; ai?: Scores | null; mentor?: Scores | null }): number | null {
  return percent(s.mentor) ?? percent(s.ai) ?? percent(s.self);
}

/** Self-assessment calibration: positive = over-rated yourself. */
export function calibrationGap(self: Scores | null | undefined, reference: Scores | null | undefined): number | null {
  const a = percent(self), b = percent(reference);
  return a === null || b === null ? null : a - b;
}
