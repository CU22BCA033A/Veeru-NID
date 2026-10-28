import { type Seg, translateSegs, unitSteps, bbox } from "./geometry";
import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

function randomShape(rng: Rng, steps: number): Seg[] {
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
  for (let tries = 0; tries < 100; tries++) {
    const segs: Seg[] = [];
    let p = { x: 0, y: 0 };
    for (let i = 0; i < steps; i++) {
      const [dx, dy] = rng.pick(dirs);
      const len = dx !== 0 && dy !== 0 ? 1 : rng.int(1, 2);
      const q = { x: p.x + dx * len, y: p.y + dy * len };
      segs.push({ a: p, b: q });
      p = q;
    }
    const b = bbox(segs);
    if (b.maxX - b.minX <= 3 && b.maxY - b.minY <= 3 && b.maxX - b.minX >= 1 && b.maxY - b.minY >= 1 && unitSteps(segs).size >= steps) {
      return translateSegs(segs, -b.minX, -b.minY);
    }
  }
  return [{ a: { x: 0, y: 0 }, b: { x: 2, y: 0 } }, { a: { x: 2, y: 0 }, b: { x: 2, y: 2 } }, { a: { x: 2, y: 2 }, b: { x: 0, y: 1 } }];
}

/** Is `shape` (same orientation) contained in `big` at some translation? */
export function containsShape(big: Set<string>, shape: Seg[], gridSize: number): boolean {
  for (let dx = -1; dx <= gridSize; dx++) {
    for (let dy = -1; dy <= gridSize; dy++) {
      const steps = unitSteps(translateSegs(shape, dx, dy));
      if ([...steps].every((s) => big.has(s))) return true;
    }
  }
  return false;
}

function segsSvg(segs: Seg[], k: number, pad: number, w: number, h: number, label: string, sw = 3): string {
  const body = segs.map((s) => `<line x1="${pad + s.a.x * k}" y1="${pad + s.a.y * k}" x2="${pad + s.b.x * k}" y2="${pad + s.b.y * k}" stroke-width="${sw}"/>`).join("");
  return svgDoc(w, h, body, label);
}

export const embeddedGenerator: Generator = {
  id: "embedded",
  subtopic: "visual.embedded",
  generate(seed) {
    const rng = new Rng(seedFor("embedded", seed));
    const difficulty = (seed % 5) + 1;
    const G = 6;
    const target = randomShape(rng, 3 + Math.min(difficulty, 3));
    const b = bbox(target);
    const ox = rng.int(0, G - b.maxX), oy = rng.int(0, G - b.maxY);
    const placed = translateSegs(target, ox, oy);
    const extra: Seg[] = [];
    const nExtra = 4 + difficulty * 2;
    const pts = () => ({ x: rng.int(0, G), y: rng.int(0, G) });
    while (extra.length < nExtra) {
      const a = pts();
      const dir = rng.pick([[1, 0], [0, 1], [1, 1], [1, -1]] as const);
      const len = rng.int(1, 3);
      const q = { x: a.x + dir[0] * len, y: a.y + dir[1] * len };
      if (q.x < 0 || q.x > G || q.y < 0 || q.y > G) continue;
      extra.push({ a, b: q });
    }
    const complex = [...placed, ...extra, { a: { x: 0, y: 0 }, b: { x: G, y: 0 } }, { a: { x: G, y: 0 }, b: { x: G, y: G } }, { a: { x: G, y: G }, b: { x: 0, y: G } }, { a: { x: 0, y: G }, b: { x: 0, y: 0 } }];
    const big = unitSteps(complex);
    const distractors: Seg[][] = [];
    const seenKeys = new Set([[...unitSteps(target)].sort().join("|")]);
    for (let tries = 0; tries < 200 && distractors.length < 3; tries++) {
      const d = randomShape(rng, 3 + Math.min(difficulty, 3));
      const key = [...unitSteps(d)].sort().join("|");
      if (seenKeys.has(key) || containsShape(big, d, G)) continue;
      seenKeys.add(key);
      distractors.push(d);
    }
    if (distractors.length < 3) return null;
    const shapes = [target, ...distractors];
    const order = rng.shuffle([0, 1, 2, 3]);
    const k = 34;
    return {
      id: `gen-embedded-${seed}`, generator: "embedded", seed, subtopic: "visual.embedded", difficulty,
      stem: "Which option figure is hidden inside the large figure? (It appears exactly as shown, the same size and not rotated.)",
      stemSvg: segsSvg(complex, k, 10, G * k + 20, G * k + 20, "A complex figure made of many lines", 2.5),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: segsSvg(shapes[ci]!, 26, 12, 3 * 26 + 24, 3 * 26 + 24, `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: "Start from the most distinctive part of each option (a diagonal or a long line) and look for it in the big figure, then check every other line around it. The correct figure fits completely; each wrong one has at least one line that the big figure doesn't have in that position.",
      takeaway: "Hunt for the most unusual line first, then verify the rest.",
    };
  },
};
