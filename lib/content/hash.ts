import { createHash } from "node:crypto";
import type { ItemInput } from "./schemas";

/** Lower-case, strip punctuation and collapse whitespace so trivial edits don't defeat duplicate checks. */
export function normaliseText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable hash of what the student actually sees: stem, options and images. */
export function itemContentHash(item: Pick<ItemInput, "stem" | "options" | "imageIds" | "stemSvg">): string {
  const options = (item.options ?? []).map((o) => normaliseText(o.text ?? "") + (o.svg ?? "")).sort();
  const payload = JSON.stringify([normaliseText(item.stem), item.stemSvg ?? "", options, [...(item.imageIds ?? [])].sort()]);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/** Trigram (Jaccard) similarity, same idea as pg_trgm, for offline near-duplicate checks. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = `  ${normaliseText(s)} `;
    const set = new Set<string>();
    for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
    return set;
  };
  const A = grams(a), B = grams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "your", "from", "into", "what", "which", "about", "their", "they", "them", "these", "those", "there", "here", "than", "then", "when", "where", "while", "would", "could", "should"]);

/**
 * True if two similar-looking texts differ in at least one meaningful word (e.g. a different
 * object or word in a templated prompt), so they are distinct questions, not duplicates.
 */
export function differsMeaningfully(a: string, b: string): boolean {
  const ta = new Set(normaliseText(a).split(" ")), tb = new Set(normaliseText(b).split(" "));
  const diff = [...ta].filter((t) => !tb.has(t)).concat([...tb].filter((t) => !ta.has(t)));
  return diff.some((t) => t.length >= 4 && !STOP.has(t));
}
