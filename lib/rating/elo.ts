/** Elo-lite skill model: each subtopic has a rating; each item difficulty maps to a rating. */
export const START_RATING = 1000;
export const TARGET_SUCCESS = 0.72;

export function itemRating(difficulty: number): number {
  return 700 + difficulty * 100; // 1 → 800 … 5 → 1200
}

export function expectedSuccess(skill: number, difficulty: number): number {
  return 1 / (1 + 10 ** ((itemRating(difficulty) - skill) / 400));
}

/** New rating after an attempt scored 0..1. Bigger steps while a subtopic is new. */
export function updateRating(skill: number, attempts: number, difficulty: number, score: number): number {
  const k = attempts < 10 ? 40 : 24;
  return Math.round((skill + k * (score - expectedSuccess(skill, difficulty))) * 10) / 10;
}
