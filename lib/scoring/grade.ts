export type Answer = string | string[] | null;

export interface GradableItem {
  type: "mcq" | "multi" | "short";
  answer: unknown;
  rubric?: { keywords?: string[]; minIdeas?: number; maxWords?: number } | null;
}

export interface Grade {
  score: number; // 0..1
  correct: boolean;
  detail?: { ideas: number; keywordHits: string[]; words: number; overLimit: boolean };
}

/** Split a typed answer into separate ideas (lines, numbered points, semicolons). */
export function splitIdeas(text: string): string[] {
  return text
    .split(/\n|;|(?:^|\s)\d+[.)]\s|•/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2 || s.length >= 6);
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Short-answer auto score (no AI): rewards enough distinct ideas and relevant vocabulary.
 * It's a guide, not a verdict. The student also self-marks against the model answer.
 */
export function gradeShort(text: string, rubric: GradableItem["rubric"]): Grade {
  const ideas = splitIdeas(text).length;
  const words = wordCount(text);
  const lower = text.toLowerCase();
  const keywords = rubric?.keywords ?? [];
  const hits = keywords.filter((k) => lower.includes(k.toLowerCase()));
  const minIdeas = rubric?.minIdeas ?? 3;
  const ideaScore = Math.min(1, ideas / minIdeas);
  const keywordTarget = Math.max(1, Math.min(keywords.length, Math.ceil(minIdeas / 2)));
  const keywordScore = keywords.length ? Math.min(1, hits.length / keywordTarget) : ideaScore;
  const overLimit = Boolean(rubric?.maxWords && words > rubric.maxWords * 1.15);
  let score = 0.65 * ideaScore + 0.35 * keywordScore;
  if (overLimit) score *= 0.85; // word limits matter in the exam
  if (words < 3) score = 0;
  score = Math.round(score * 100) / 100;
  return { score, correct: score >= 0.6, detail: { ideas, keywordHits: hits, words, overLimit } };
}

export function grade(item: GradableItem, answer: Answer): Grade {
  if (answer === null || answer === undefined || (Array.isArray(answer) && answer.length === 0) || answer === "") {
    return { score: 0, correct: false };
  }
  if (item.type === "mcq") {
    const ok = answer === item.answer;
    return { score: ok ? 1 : 0, correct: ok };
  }
  if (item.type === "multi") {
    const want = new Set(item.answer as string[]);
    const got = new Set(Array.isArray(answer) ? answer : [answer]);
    const ok = want.size === got.size && [...want].every((a) => got.has(a));
    // partial credit: correct picks minus wrong picks, never below 0
    const right = [...got].filter((a) => want.has(a)).length;
    const wrong = got.size - right;
    return { score: ok ? 1 : Math.max(0, (right - wrong) / want.size) * 0.5, correct: ok };
  }
  return gradeShort(String(answer), item.rubric);
}
