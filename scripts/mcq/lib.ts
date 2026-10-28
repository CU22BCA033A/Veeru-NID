import { createHash } from "node:crypto";
import type { ItemInput } from "../../lib/content/schemas";

export type Wrong = [option: string, why: string];
export interface Q {
  sub: string;
  d: 1 | 2 | 3 | 4 | 5;
  stem: string;
  right: string;
  wrong: Wrong[];
  why: string;
  take: string;
  source?: ItemInput["source"];
  review?: boolean;
}

/** Correct option is authored first; rotate deterministically so answers spread across a–d. */
export function toItem(prefix: string, q: Q, n: number): ItemInput {
  const all = [q.right, ...q.wrong.map((w) => w[0])];
  const shift = parseInt(createHash("md5").update(q.stem).digest("hex").slice(0, 6), 16) % all.length;
  const rotated = all.map((_, i) => all[(i + shift) % all.length]!);
  const ids = ["a", "b", "c", "d", "e", "f"];
  const options = rotated.map((text, i) => ({ id: ids[i]!, text }));
  const answer = ids[rotated.indexOf(q.right)]!;
  const distractors: Record<string, string> = {};
  for (const [text, why] of q.wrong) distractors[ids[rotated.indexOf(text)]!] = why;
  return {
    id: `${prefix}-${String(n).padStart(3, "0")}`,
    type: "mcq",
    subtopic: q.sub,
    difficulty: q.d,
    source: q.source ?? "Practice",
    stem: q.stem,
    imageIds: [],
    options,
    answer,
    explanation: q.why,
    distractors,
    takeaway: q.take,
    tags: [],
    needsReview: q.review ?? false,
  };
}
