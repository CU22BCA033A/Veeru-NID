/** Figures are sets of straight segments on an integer grid, plus optional filled dots. */
export interface Pt {
  x: number;
  y: number;
}
export interface Seg {
  a: Pt;
  b: Pt;
}
export interface Figure {
  segs: Seg[];
  dots: Pt[]; // filled circles (help make figures asymmetric and memorable)
  size: number; // grid is 0..size in both axes
}

export type Transform = (p: Pt, size: number) => Pt;
export const T = {
  identity: ((p) => p) as Transform,
  mirrorV: ((p, s) => ({ x: s - p.x, y: p.y })) as Transform, // mirror on a vertical line (left↔right)
  mirrorH: ((p, s) => ({ x: p.x, y: s - p.y })) as Transform, // water image (top↔bottom)
  rot90cw: ((p, s) => ({ x: s - p.y, y: p.x })) as Transform, // y grows downward in SVG
  rot90ccw: ((p, s) => ({ x: p.y, y: s - p.x })) as Transform,
  rot180: ((p, s) => ({ x: s - p.x, y: s - p.y })) as Transform,
};

export function transform(fig: Figure, t: Transform): Figure {
  return {
    size: fig.size,
    segs: fig.segs.map((s) => ({ a: t(s.a, fig.size), b: t(s.b, fig.size) })),
    dots: fig.dots.map((d) => t(d, fig.size)),
  };
}

/** Order-independent key for comparing figures. */
export function figureKey(fig: Figure): string {
  const segs = fig.segs
    .map((s) => {
      const p = `${s.a.x},${s.a.y}`, q = `${s.b.x},${s.b.y}`;
      return p < q ? `${p}-${q}` : `${q}-${p}`;
    })
    .sort();
  const dots = fig.dots.map((d) => `${d.x},${d.y}`).sort();
  return `${segs.join("|")}#${dots.join("|")}`;
}

export function sameFigure(a: Figure, b: Figure): boolean {
  return figureKey(a) === figureKey(b);
}

/** Break every segment into unit lattice steps (handles overlaps/collinear lines). */
export function unitSteps(segs: Seg[]): Set<string> {
  const out = new Set<string>();
  for (const s of segs) {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    if (n === 0) continue;
    if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) {
      out.add(stepKey(s.a, s.b)); // non-lattice slope: keep as an atomic segment
      continue;
    }
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 0; i < n; i++) {
      const p = { x: s.a.x + sx * i, y: s.a.y + sy * i };
      out.add(stepKey(p, { x: p.x + sx, y: p.y + sy }));
    }
  }
  return out;
}

function stepKey(p: Pt, q: Pt): string {
  const a = `${p.x},${p.y}`, b = `${q.x},${q.y}`;
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function translateSegs(segs: Seg[], dx: number, dy: number): Seg[] {
  return segs.map((s) => ({ a: { x: s.a.x + dx, y: s.a.y + dy }, b: { x: s.b.x + dx, y: s.b.y + dy } }));
}

export function bbox(segs: Seg[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = segs.flatMap((s) => [s.a.x, s.b.x]);
  const ys = segs.flatMap((s) => [s.a.y, s.b.y]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
