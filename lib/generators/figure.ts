import type { Figure, Pt, Seg } from "./geometry";
import { sameFigure, T, transform } from "./geometry";
import type { Rng } from "./rng";

const DIRS: Pt[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 },
];

/**
 * A random connected polyline on a size×size grid with a dot, guaranteed to have no mirror
 * or rotational symmetry (so mirror/water/rotation options are always distinct).
 */
export function randomAsymmetricFigure(rng: Rng, difficulty: number): Figure {
  const size = 6;
  const steps = 3 + difficulty; // more segments = harder
  for (let attempt = 0; attempt < 200; attempt++) {
    const segs: Seg[] = [];
    let p: Pt = { x: rng.int(1, size - 1), y: rng.int(1, size - 1) };
    const used = new Set<string>();
    for (let i = 0; i < steps; i++) {
      const allowDiag = difficulty >= 2;
      const dirs = DIRS.filter((d, idx) => (allowDiag || idx < 4));
      const d = rng.pick(dirs);
      const len = rng.int(1, 3);
      const q = { x: p.x + d.x * len, y: p.y + d.y * len };
      if (q.x < 0 || q.y < 0 || q.x > size || q.y > size) continue;
      const key = [p, q].map((v) => `${v.x},${v.y}`).sort().join("-");
      if (used.has(key)) continue;
      used.add(key);
      segs.push({ a: p, b: q });
      p = q;
    }
    if (segs.length < 3) continue;
    const dot = segs[rng.int(0, segs.length - 1)]!.b;
    const fig: Figure = { segs, dots: [dot], size };
    if (isAsymmetric(fig)) return fig;
  }
  throw new Error("could not build an asymmetric figure");
}

export function isAsymmetric(fig: Figure): boolean {
  const variants = [T.identity, T.mirrorV, T.mirrorH, T.rot90cw, T.rot90ccw, T.rot180].map((t) => transform(fig, t));
  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) if (sameFigure(variants[i]!, variants[j]!)) return false;
  }
  // also not equal to the diagonal reflections (which are other distractors)
  const diag1 = transform(variants[1]!, T.rot90cw);
  const diag2 = transform(variants[1]!, T.rot90ccw);
  return variants.every((v) => !sameFigure(v, diag1) && !sameFigure(v, diag2));
}
