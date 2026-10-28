import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

/** Paper is the square [0,4]×[0,4] (y grows downward). Holes sit at cell centres. */
type Hole = { x: number; y: number };
type Fold = "left-over-right" | "right-over-left" | "top-over-bottom" | "bottom-over-top" | "diagonal";

interface Region {
  x0: number; x1: number; y0: number; y1: number; triangle?: boolean; // triangle: keep x ≥ y half
}

function reflect(h: Hole, fold: Fold, r: Region): Hole {
  switch (fold) {
    case "left-over-right":
    case "right-over-left": {
      const m = (r.x0 + r.x1) / 2;
      return { x: 2 * m - h.x, y: h.y };
    }
    case "top-over-bottom":
    case "bottom-over-top": {
      const m = (r.y0 + r.y1) / 2;
      return { x: h.x, y: 2 * m - h.y };
    }
    case "diagonal":
      return { x: h.y, y: h.x };
  }
}

function applyFold(r: Region, fold: Fold): Region {
  const mx = (r.x0 + r.x1) / 2, my = (r.y0 + r.y1) / 2;
  switch (fold) {
    case "left-over-right": return { ...r, x0: mx };
    case "right-over-left": return { ...r, x1: mx };
    case "top-over-bottom": return { ...r, y0: my };
    case "bottom-over-top": return { ...r, y1: my };
    case "diagonal": return { ...r, triangle: true };
  }
}

/** Unfold: every fold (last first) adds the mirror image of the current holes. */
export function unfold(holes: Hole[], folds: Fold[]): Hole[] {
  const regions: Region[] = [{ x0: 0, x1: 4, y0: 0, y1: 4 }];
  for (const f of folds) regions.push(applyFold(regions[regions.length - 1]!, f));
  let current = holes;
  for (let i = folds.length - 1; i >= 0; i--) {
    current = [...current, ...current.map((h) => reflect(h, folds[i]!, regions[i]!))];
  }
  return dedupe(current);
}

function dedupe(holes: Hole[]): Hole[] {
  const seen = new Map(holes.map((h) => [`${h.x},${h.y}`, h]));
  return [...seen.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

const holesKey = (hs: Hole[]) => dedupe(hs).map((h) => `${h.x},${h.y}`).join("|");

const K = 22; // px per unit
function square(holes: Hole[], label: string): string {
  const body =
    `<rect x="6" y="6" width="${4 * K}" height="${4 * K}" stroke-width="2.5"/>` +
    holes.map((h) => `<circle cx="${6 + h.x * K}" cy="${6 + h.y * K}" r="6" stroke-width="2"/>`).join("");
  return svgDoc(4 * K + 12, 4 * K + 12, body, label);
}

function stepSvg(region: Region, fold: Fold | null, holes: Hole[], ox: number): string {
  const X = (v: number) => ox + 6 + v * K, Y = (v: number) => 6 + v * K;
  let s = `<rect x="${X(0)}" y="${Y(0)}" width="${4 * K}" height="${4 * K}" stroke-width="1" stroke-dasharray="3 4" opacity="0.35"/>`;
  if (region.triangle) {
    s += `<polygon points="${X(region.x0)},${Y(region.y0)} ${X(region.x1)},${Y(region.y0)} ${X(region.x1)},${Y(region.y1)}" stroke-width="2.5" fill="currentColor" fill-opacity="0.06"/>`;
  } else {
    s += `<rect x="${X(region.x0)}" y="${Y(region.y0)}" width="${(region.x1 - region.x0) * K}" height="${(region.y1 - region.y0) * K}" stroke-width="2.5" fill="currentColor" fill-opacity="0.06"/>`;
  }
  if (fold) {
    const mx = (region.x0 + region.x1) / 2, my = (region.y0 + region.y1) / 2;
    const line =
      fold === "diagonal"
        ? [X(region.x0), Y(region.y0), X(region.x1), Y(region.y1)]
        : fold.endsWith("right") || fold.endsWith("left")
          ? [X(mx), Y(region.y0) - 4, X(mx), Y(region.y1) + 4]
          : [X(region.x0) - 4, Y(my), X(region.x1) + 4, Y(my)];
    s += `<line x1="${line[0]}" y1="${line[1]}" x2="${line[2]}" y2="${line[3]}" stroke-width="2.5" stroke-dasharray="7 5"/>`;
    const arrow: Record<Fold, [number, number, number, number]> = {
      "left-over-right": [X(region.x0 + 0.5), Y(my), X(region.x1 - 0.5), Y(my)],
      "right-over-left": [X(region.x1 - 0.5), Y(my), X(region.x0 + 0.5), Y(my)],
      "top-over-bottom": [X(mx), Y(region.y0 + 0.5), X(mx), Y(region.y1 - 0.5)],
      "bottom-over-top": [X(mx), Y(region.y1 - 0.5), X(mx), Y(region.y0 + 0.5)],
      diagonal: [X(region.x0 + 0.8), Y(region.y1 - 0.8), X(region.x1 - 0.8), Y(region.y0 + 0.8)],
    };
    const [a, b, c, d] = arrow[fold];
    const ang = Math.atan2(d - b, c - a);
    const hx = (k: number) => (c - 9 * Math.cos(ang + k)).toFixed(1), hy = (k: number) => (d - 9 * Math.sin(ang + k)).toFixed(1);
    s += `<path d="M${a},${b} Q${(a + c) / 2 + 10 * Math.sin(ang)},${(b + d) / 2 - 10 * Math.cos(ang)} ${c},${d}" stroke-width="2"/><path d="M${hx(0.5)},${hy(0.5)} L${c},${d} L${hx(-0.5)},${hy(-0.5)}" stroke-width="2"/>`;
  }
  s += holes.map((h) => `<circle cx="${X(h.x)}" cy="${Y(h.y)}" r="6" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>`).join("");
  return s;
}

export const paperFoldGenerator: Generator = {
  id: "paper-fold",
  subtopic: "visual.paper-fold",
  generate(seed) {
    const rng = new Rng(seedFor("paper-fold", seed));
    const difficulty = (seed % 5) + 1;
    const V: Fold[] = ["left-over-right", "right-over-left"], H: Fold[] = ["top-over-bottom", "bottom-over-top"];
    const folds: Fold[] =
      difficulty === 1 ? [rng.pick([...V, ...H])]
      : difficulty === 4 ? ["diagonal"]
      : rng.chance(0.5) ? [rng.pick(V), rng.pick(H)] : [rng.pick(H), rng.pick(V)];
    const regions: Region[] = [{ x0: 0, x1: 4, y0: 0, y1: 4 }];
    for (const f of folds) regions.push(applyFold(regions[regions.length - 1]!, f));
    const final = regions[regions.length - 1]!;
    // candidate hole positions inside the final region (strictly inside the triangle if diagonal)
    const cells: Hole[] = [];
    for (let x = final.x0 + 0.5; x < final.x1; x++) {
      for (let y = final.y0 + 0.5; y < final.y1; y++) if (!final.triangle || x > y) cells.push({ x, y });
    }
    const nHoles = Math.min(cells.length, difficulty >= 5 ? 3 : difficulty >= 3 ? 2 : 1 + rng.int(0, 1));
    const holes = rng.shuffle(cells).slice(0, nHoles);
    const correct = unfold(holes, folds);
    // distractors: forgot to unfold, unfolded only the last fold, unfolded along the wrong axis
    const wrongAxis = folds.map((f): Fold => (f === "diagonal" ? "left-over-right" : V.includes(f) ? "top-over-bottom" : "left-over-right"));
    const candidates = [holes, unfold(holes, folds.slice(-1)), unfold(holes, wrongAxis), correct.slice(0, -1), [...correct, { x: 0.5, y: 3.5 }], [...holes, { x: 4 - holes[0]!.x, y: 4 - holes[0]!.y }]];
    const distractors: Hole[][] = [];
    for (const c of candidates) {
      const k = holesKey(c);
      if (k !== holesKey(correct) && c.length && !distractors.some((d) => holesKey(d) === k)) distractors.push(c);
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) return null;
    const sets = [correct, ...distractors];
    const order = rng.shuffle([0, 1, 2, 3]);
    let stem = "";
    let ox = 0;
    for (let i = 0; i < folds.length; i++) {
      stem += stepSvg(regions[i]!, folds[i]!, [], ox);
      ox += 4 * K + 26;
    }
    stem += stepSvg(final, null, holes, ox);
    ox += 4 * K + 12;
    return {
      id: `gen-fold-${seed}`, generator: "paper-fold", seed, subtopic: "visual.paper-fold", difficulty,
      stem: `A square sheet of paper is folded as shown (dashed line = fold, arrow = direction), and then ${holes.length === 1 ? "a hole is" : `${holes.length} holes are`} punched through all the layers. What will the sheet look like when unfolded?`,
      stemSvg: svgDoc(ox, 4 * K + 12, stem, "Folding steps and the punched folded paper"),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: square(sets[ci]!, `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: `Unfold one step at a time, starting with the LAST fold. Each unfold mirrors every hole across that fold line, so the number of holes doubles per fold: ${holes.length} → ${correct.length}. Check that the holes are symmetric about each fold line.`,
      takeaway: "Unfold in reverse order; each fold mirrors the holes and doubles them.",
    };
  },
};
