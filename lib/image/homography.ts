/** Pure maths for straightening a photographed sheet (no DOM), so it can be unit-tested. */
export type P = { x: number; y: number };

/** Solve the 8 homography coefficients mapping src[i] → dst[i] (4 point pairs). */
export function homography(src: P[], dst: P[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]!, { x: u, y: v } = dst[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  return solve(A, b);
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    [M[c], M[p]] = [M[p]!, M[c]!];
    const pivot = M[c]![c]!;
    if (Math.abs(pivot) < 1e-12) throw new Error("corners are degenerate");
    for (let k = c; k <= n; k++) M[c]![k]! /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row) => row[n]!);
}

export function apply(h: number[], p: P): P {
  const w = h[6]! * p.x + h[7]! * p.y + 1;
  return { x: (h[0]! * p.x + h[1]! * p.y + h[2]!) / w, y: (h[3]! * p.x + h[4]! * p.y + h[5]!) / w };
}

/** Output size for a quad: keep A-series proportions (√2), portrait or landscape by the quad's shape. */
export function outputSize(quad: P[], longSide = 1600): { w: number; h: number } {
  const d = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = (d(quad[0]!, quad[1]!) + d(quad[3]!, quad[2]!)) / 2;
  const height = (d(quad[0]!, quad[3]!) + d(quad[1]!, quad[2]!)) / 2;
  const short = Math.round(longSide / Math.SQRT2);
  return height >= width ? { w: short, h: longSide } : { w: longSide, h: short };
}
