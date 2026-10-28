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
