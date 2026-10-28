import type { PoolItem } from "./builder";

/**
 * "Similar but new" items for homework: same generator (a fresh puzzle of the same kind), else
 * the same subtopic and type, closest in difficulty. Never returns a served item.
 */
export function pickVariants(source: PoolItem, pool: PoolItem[], served: Set<string>, n: number): PoolItem[] {
  const fresh = pool.filter((p) => p.id !== source.id && !served.has(p.id));
  const same = source.generator
    ? fresh.filter((p) => p.generator === source.generator)
    : fresh.filter((p) => p.subtopic === source.subtopic && p.type === source.type);
  const fallback = fresh.filter((p) => p.subtopic === source.subtopic);
  const ranked = (list: PoolItem[]) => [...list].sort((a, b) => Math.abs(a.difficulty - source.difficulty) - Math.abs(b.difficulty - source.difficulty) || a.id.localeCompare(b.id));
  const out = ranked(same).slice(0, n);
  for (const f of ranked(fallback)) {
    if (out.length >= n) break;
    if (!out.includes(f)) out.push(f);
  }
  return out;
}
