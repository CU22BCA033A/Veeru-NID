/**
 * Readiness (0–100): how exam-ready Veeru looks right now. Combines recent mock scores,
 * studio rubric scores, daily accuracy and consistency; missing parts are left out rather than
 * counted as zero.
 */
export interface ReadinessInput {
  mockPercents: number[]; // newest first
  studioPercents: number[]; // newest first
  dailyAccuracy: number | null; // 0..100, last 14 days
  consistency: number | null; // 0..100, share of the last 14 study days completed
}

const WEIGHTS = { mocks: 0.45, studio: 0.25, accuracy: 0.15, consistency: 0.15 };

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function readiness(i: ReadinessInput): { score: number | null; parts: Record<keyof typeof WEIGHTS, number | null> } {
  const parts = {
    mocks: avg(i.mockPercents.slice(0, 3)),
    studio: avg(i.studioPercents.slice(0, 10)),
    accuracy: i.dailyAccuracy,
    consistency: i.consistency,
  };
  let sum = 0, w = 0;
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const v = parts[k];
    if (v === null || Number.isNaN(v)) continue;
    sum += v * WEIGHTS[k];
    w += WEIGHTS[k];
  }
  return { score: w ? Math.round(sum / w) : null, parts };
}
