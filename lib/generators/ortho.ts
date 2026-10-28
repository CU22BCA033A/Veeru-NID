import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

/** heights[x][d]: x = column left→right, d = row front(0)→back */
type Heights = number[][];

export function frontView(h: Heights): number[] {
  return h.map((col) => Math.max(...col));
}
export function sideViewFromRight(h: Heights): number[] {
  // Standing on the right looking left, the FRONT row appears on your LEFT.
  const depth = h[0]!.length;
  return Array.from({ length: depth }, (_, d) => Math.max(...h.map((col) => col[d]!)));
}
export function topView(h: Heights): boolean[][] {
  return h.map((col) => col.map((v) => v > 0));
}

const viewKey = (v: number[]) => v.join(",");

function columnsSvg(cols: number[], label: string): string {
  const k = 22, maxH = 3;
  let s = "";
  cols.forEach((n, i) => {
    for (let l = 0; l < n; l++) s += `<rect x="${8 + i * k}" y="${8 + (maxH - 1 - l) * k}" width="${k}" height="${k}" stroke-width="2"/>`;
  });
  s += `<line x1="2" y1="${8 + maxH * k}" x2="${14 + cols.length * k}" y2="${8 + maxH * k}" stroke-width="1.5" opacity="0.5"/>`;
  return svgDoc(16 + 3 * k, 14 + maxH * k, s, label);
}

function topSvg(t: boolean[][], label: string): string {
  const k = 22;
  let s = "";
  const depth = t[0]!.length;
  t.forEach((col, x) => col.forEach((on, d) => {
    if (on) s += `<rect x="${8 + x * k}" y="${8 + (depth - 1 - d) * k}" width="${k}" height="${k}" stroke-width="2"/>`;
  }));
  return svgDoc(16 + 3 * k, 14 + 3 * k, s, label);
}

function isoSvg(h: Heights): string {
  const a = 26, c30 = Math.cos(Math.PI / 6), s30 = 0.5;
  const ox = 20, oy = 120;
  const P = (x: number, d: number, l: number) => `${(ox + (x + d) * a * c30).toFixed(1)},${(oy + (x - d) * a * s30 - l * a).toFixed(1)}`;
  const cubes: [number, number, number][] = [];
  h.forEach((col, x) => col.forEach((n, d) => { for (let l = 0; l < n; l++) cubes.push([x, d, l]); }));
  cubes.sort((p, q) => (p[0] - p[1]) - (q[0] - q[1]) || p[2] - q[2]);
  let s = "";
  const face = (pts: string[], tint: number) =>
    `<polygon points="${pts.join(" ")}" fill="var(--surface, #fff)" stroke="none"/><polygon points="${pts.join(" ")}" fill="currentColor" fill-opacity="${tint}" stroke-width="2"/>`;
  for (const [x, d, l] of cubes) {
    s += face([P(x, d, l + 1), P(x + 1, d, l + 1), P(x + 1, d + 1, l + 1), P(x, d + 1, l + 1)], 0.04);
    s += face([P(x, d, l), P(x + 1, d, l), P(x + 1, d, l + 1), P(x, d, l + 1)], 0.16);
    s += face([P(x + 1, d, l), P(x + 1, d + 1, l), P(x + 1, d + 1, l + 1), P(x + 1, d, l + 1)], 0.32);
  }
  // arrow showing the FRONT direction
  s += `<text x="6" y="${oy + 60}" font-size="12" fill="currentColor" stroke="none" font-family="sans-serif">FRONT ↗</text>`;
  return svgDoc(6 * a * c30 + 50, 200, s, "Isometric drawing of stacked cubes");
}

export const orthoGenerator: Generator = {
  id: "ortho-views",
  subtopic: "visual.ortho",
  generate(seed) {
    const rng = new Rng(seedFor("ortho-views", seed));
    const difficulty = (seed % 5) + 1;
    const maxH = difficulty <= 2 ? 2 : 3;
    const h: Heights = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => (rng.chance(0.75) ? rng.int(1, maxH) : 0)));
    if (h.every((col) => col.every((v) => v === 0))) return null;
    const ask = rng.pick(["front", "side"] as const);
    const f = frontView(h), sv = sideViewFromRight(h);
    const correct = ask === "front" ? f : sv;
    const others = [ask === "front" ? sv : f, [...correct].reverse(), correct.map((v) => Math.min(3, v + 1)), correct.map((v, i) => (i === 1 ? Math.max(0, v - 1) : v))];
    const options: number[][] = [correct];
    for (const o of others) if (options.length < 4 && !options.some((x) => viewKey(x) === viewKey(o)) && o.some((v) => v > 0)) options.push(o);
    if (options.length < 4) return null;
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      id: `gen-ortho-${seed}`, generator: "ortho-views", seed, subtopic: "visual.ortho", difficulty,
      stem: ask === "front"
        ? "Look at the stack of cubes. Which option is its FRONT view (looking from the side marked FRONT)?"
        : "Look at the stack of cubes. Which option is its view from the RIGHT side?",
      stemSvg: isoSvg(h),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: columnsSvg(options[ci]!, `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: ask === "front"
        ? `In a front view you see, for each column from left to right, the TALLEST stack in that column, no matter how far back it is. Here the column heights are ${f.join(", ")}.`
        : `From the right side you see each row from front to back, and the tallest stack in each row decides the height. Standing on the right, the front row appears on your left. Heights: ${sv.join(", ")}.`,
      takeaway: "An orthographic view shows the tallest block along each line of sight.",
    };
  },
};
