import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

type V3 = [number, number, number];
const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];
const key = (v: V3) => v.join(",");

/** The 11 nets of a cube, as [col,row] cells. */
export const CUBE_NETS: [number, number][][] = [
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[1, 0], [1, 1], [0, 1], [2, 1], [2, 2], [3, 2]],
];

/**
 * Fold a net: roll a cube across the cells (BFS), tracking which way each cell faces.
 * Returns the outward normal of every cell (same order as `cells`).
 */
export function foldNet(cells: [number, number][]): V3[] {
  const index = new Map(cells.map((c, i) => [`${c[0]},${c[1]}`, i]));
  const normal: (V3 | null)[] = cells.map(() => null);
  const right: (V3 | null)[] = cells.map(() => null);
  const down: (V3 | null)[] = cells.map(() => null);
  normal[0] = [0, 0, 1]; right[0] = [1, 0, 0]; down[0] = [0, -1, 0];
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    const [cx, cy] = cells[i]!;
    const n = normal[i]!, r = right[i]!, d = down[i]!;
    const moves: [number, number, V3, V3, V3][] = [
      [1, 0, r, neg(n), d], // roll right: new normal = right, new right = -normal
      [-1, 0, neg(r), n, d],
      [0, 1, d, r, neg(n)], // roll down: new normal = down, new down = -normal
      [0, -1, neg(d), r, n],
    ];
    for (const [dx, dy, nn, nr, nd] of moves) {
      const j = index.get(`${cx + dx},${cy + dy}`);
      if (j === undefined || normal[j]) continue;
      normal[j] = nn; right[j] = nr; down[j] = nd;
      queue.push(j);
    }
  }
  if (normal.some((v) => !v)) throw new Error("net is not connected");
  return normal as V3[];
}

const SYMBOLS = ["A", "B", "C", "D", "E", "F", "P", "Q", "R", "S", "T", "U", "1", "2", "3", "4", "5", "6"];

export const cubeNetGenerator: Generator = {
  id: "cube-net",
  subtopic: "visual.cube-net",
  generate(seed) {
    const rng = new Rng(seedFor("cube-net", seed));
    const difficulty = (seed % 5) + 1;
    let cells = rng.pick(CUBE_NETS).map((c) => [...c] as [number, number]);
    if (rng.chance(0.5)) {
      const maxX = Math.max(...cells.map((c) => c[0]));
      cells = cells.map(([x, y]) => [maxX - x, y]);
    }
    // put the BFS start first, keep shape
    const normals = foldNet(cells);
    const start = rng.pick(["letters", "numbers"]) === "letters" ? 0 : 12;
    const labels = rng.shuffle(SYMBOLS.slice(start, start + 6));
    const askIdx = rng.int(0, 5);
    const oppIdx = normals.findIndex((v) => key(v) === key(neg(normals[askIdx]!)));
    const wrongIdx = rng.shuffle([0, 1, 2, 3, 4, 5].filter((i) => i !== askIdx && i !== oppIdx)).slice(0, 3);
    const order = rng.shuffle([oppIdx, ...wrongIdx]);
    const s = 56;
    const maxX = Math.max(...cells.map((c) => c[0])), maxY = Math.max(...cells.map((c) => c[1]));
    const body = cells
      .map(([x, y], i) => {
        const px = 6 + x * s, py = 6 + y * s;
        return `<rect x="${px}" y="${py}" width="${s}" height="${s}" stroke-width="2.5"/><text x="${px + s / 2}" y="${py + s / 2 + 8}" font-size="24" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">${labels[i]}</text>`;
      })
      .join("");
    const ask = labels[askIdx]!;
    return {
      id: `gen-net-${seed}`, generator: "cube-net", seed, subtopic: "visual.cube-net", difficulty,
      stem: `This net is folded to make a cube. Which face will be OPPOSITE the face marked ${ask}?`,
      stemSvg: svgDoc(12 + (maxX + 1) * s, 12 + (maxY + 1) * s, body, `Cube net with faces ${labels.join(", ")}`),
      options: order.map((i, k) => ({ id: OPTION_IDS[k]!, text: labels[i]! })),
      answer: OPTION_IDS[order.indexOf(oppIdx)]!,
      explanation: `Faces that touch each other in the net (sharing an edge) end up adjacent on the cube, so they can't be opposite. In a straight row of three squares, the first and third are always opposite. Fold it in your head around face ${ask}: the face left over that never touches ${ask} is ${labels[oppIdx]}.`,
      takeaway: "In a row of 3, ends are opposite; touching faces are never opposite.",
    };
  },
};

/** Standard dice: opposite faces add up to 7. */
export const diceGenerator: Generator = {
  id: "dice",
  subtopic: "visual.dice",
  generate(seed) {
    const rng = new Rng(seedFor("dice", seed));
    const difficulty = (seed % 5) + 1;
    // A die is fully described by which number is on +x,-x,+y,-y,+z,-z. Start standard and spin randomly.
    let faces: Record<string, number> = { "1,0,0": 3, "-1,0,0": 4, "0,1,0": 1, "0,-1,0": 6, "0,0,1": 2, "0,0,-1": 5 };
    if (rng.chance(0.5)) faces = { ...faces, "1,0,0": 4, "-1,0,0": 3 }; // mirror handedness
    const rotate = (f: Record<string, number>, axis: 0 | 1 | 2) => {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(f)) {
        const [x, y, z] = k.split(",").map(Number) as V3;
        const p: V3 = axis === 0 ? [x, -z, y] : axis === 1 ? [z, y, -x] : [-y, x, z];
        out[key(p.map((c) => c + 0) as V3)] = v;
      }
      return out;
    };
    const views: Record<string, number>[] = [];
    let f = faces;
    while (views.length < 2) {
      for (let i = rng.int(1, 4); i > 0; i--) f = rotate(f, rng.int(0, 2) as 0 | 1 | 2);
      const view = { top: f["0,1,0"]!, front: f["0,0,1"]!, right: f["1,0,0"]! };
      if (!views.some((v) => JSON.stringify(v) === JSON.stringify(view))) views.push(f);
    }
    const shown = views.map((v) => [v["0,1,0"]!, v["0,0,1"]!, v["1,0,0"]!] as [number, number, number]);
    // Ask about a face visible in view 1; with standard dice the opposite is 7 − n.
    const ask = rng.pick(shown[0]!);
    const correct = 7 - ask;
    const pool = [1, 2, 3, 4, 5, 6].filter((n) => n !== ask && n !== correct);
    const values = rng.shuffle([correct, ...rng.shuffle(pool).slice(0, 3)]);
    const cube = (top: number, front: number, right: number, ox: number) => {
      const a = 34;
      const P = (x: number, y: number) => `${(ox + x).toFixed(1)},${y.toFixed(1)}`;
      const topF = `${P(0, 30)} ${P(a * 1.2, 30 - a * 0.6)} ${P(a * 2.4, 30)} ${P(a * 1.2, 30 + a * 0.6)}`;
      const frontF = `${P(0, 30)} ${P(a * 1.2, 30 + a * 0.6)} ${P(a * 1.2, 30 + a * 0.6 + a * 1.4)} ${P(0, 30 + a * 1.4)}`;
      const rightF = `${P(a * 1.2, 30 + a * 0.6)} ${P(a * 2.4, 30)} ${P(a * 2.4, 30 + a * 1.4)} ${P(a * 1.2, 30 + a * 0.6 + a * 1.4)}`;
      const t = (x: number, y: number, n: number) =>
        `<text x="${(ox + x).toFixed(1)}" y="${y.toFixed(1)}" font-size="22" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">${n}</text>`;
      return `<polygon points="${topF}" stroke-width="2.5"/><polygon points="${frontF}" stroke-width="2.5"/><polygon points="${rightF}" stroke-width="2.5" fill="currentColor" fill-opacity="0.08"/>${t(a * 1.2, 38, top)}${t(a * 0.6, 30 + a * 1.1, front)}${t(a * 1.8, 30 + a * 1.1, right)}`;
    };
    const body = cube(shown[0]![0], shown[0]![1], shown[0]![2], 10) + cube(shown[1]![0], shown[1]![1], shown[1]![2], 120);
    return {
      id: `gen-dice-${seed}`, generator: "dice", seed, subtopic: "visual.dice", difficulty,
      stem: `Two views of the same standard die are shown (opposite faces of a standard die add up to 7). Which number is opposite ${ask}?`,
      stemSvg: svgDoc(212, 120, body, `Two views of a die: first shows ${shown[0]!.join(", ")}; second shows ${shown[1]!.join(", ")}`),
      options: values.map((v, i) => ({ id: OPTION_IDS[i]!, text: String(v) })),
      answer: OPTION_IDS[values.indexOf(correct)]!,
      explanation: `On a standard die opposite faces always sum to 7, so ${ask} is opposite ${correct}. You can double-check with the views: numbers shown together on one view are neighbours, so they can never be opposite each other.`,
      takeaway: "Standard die: opposite faces sum to 7; faces seen together are adjacent.",
    };
  },
};
