import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

/** Triangles in a triangle cut by `m` lines from the apex and `h` lines parallel to the base. */
export function countTrianglesFan(apexLines: number, levels: number): number {
  // apexLines = interior lines from apex; base is split into apexLines+1 parts → apexLines+2 rays.
  const rays = apexLines + 2;
  return levels * ((rays * (rays - 1)) / 2);
}

/** Squares (of every size) in an n×m grid of unit squares. */
export function countSquaresGrid(n: number, m: number): number {
  let total = 0;
  for (let k = 1; k <= Math.min(n, m); k++) total += (n - k + 1) * (m - k + 1);
  return total;
}

function numberOptions(rng: Rng, correct: number) {
  const set = new Set<number>([correct]);
  const deltas = rng.shuffle([-3, -2, -1, 1, 2, 3, 4, -4, 5, 6]);
  for (const d of deltas) {
    if (set.size === 4) break;
    if (correct + d > 0) set.add(correct + d);
  }
  const values = rng.shuffle([...set]);
  return { options: values.map((v, i) => ({ id: OPTION_IDS[i]!, text: String(v) })), answer: OPTION_IDS[values.indexOf(correct)]! };
}

export const triangleCountGenerator: Generator = {
  id: "count-triangles",
  subtopic: "visual.figure-count",
  generate(seed) {
    const rng = new Rng(seedFor("count-triangles", seed));
    const difficulty = (seed % 5) + 1;
    const apexLines = Math.min(1 + Math.floor(difficulty / 2) + rng.int(0, 1), 4);
    const levels = Math.min(1 + Math.floor((difficulty - 1) / 2) + rng.int(0, 1), 4);
    // geometry: apex (150,15), base from (20,230) to (280,230)
    const A = { x: 150, y: 15 }, L = { x: 20, y: 230 }, R = { x: 280, y: 230 };
    // split the base unevenly (seeded) so pictures differ even for the same counts
    const cuts = rng.shuffle([0.18, 0.3, 0.42, 0.55, 0.66, 0.78, 0.88]).slice(0, apexLines).sort();
    const levelYs = Array.from({ length: levels - 1 }, (_, i) => 230 - ((i + 1) * 215) / levels + rng.int(-8, 8));
    const lerp = (p: { x: number; y: number }, q: { x: number; y: number }, t: number) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    let body = `<polygon points="${A.x},${A.y} ${L.x},${L.y} ${R.x},${R.y}" stroke-width="2.5"/>`;
    for (const c of cuts) {
      const b = lerp(L, R, c);
      body += `<line x1="${A.x}" y1="${A.y}" x2="${b.x.toFixed(1)}" y2="${b.y}" stroke-width="2.5"/>`;
    }
    for (const y of levelYs) {
      const t = (y - A.y) / (L.y - A.y);
      const p = lerp(A, L, t), q = lerp(A, R, t);
      body += `<line x1="${p.x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${y.toFixed(1)}" stroke-width="2.5"/>`;
    }
    const correct = countTrianglesFan(apexLines, levels);
    const { options, answer } = numberOptions(rng, correct);
    const rays = apexLines + 2;
    return {
      id: `gen-tri-${seed}`, generator: "count-triangles", seed, subtopic: "visual.figure-count", difficulty,
      stem: "How many triangles are there in this figure?",
      stemSvg: svgDoc(300, 245, body, "A large triangle divided by lines from the top corner and lines parallel to the base"),
      options, answer,
      explanation: `Count systematically. There are ${rays} lines from the top corner, so in each horizontal band you can choose any 2 of them: ${rays}×${rays - 1}÷2 = ${(rays * (rays - 1)) / 2} triangles. Each of the ${levels} horizontal line${levels > 1 ? "s" : ""} (including the base) closes off that many triangles, so the total is ${levels} × ${(rays * (rays - 1)) / 2} = ${correct}.`,
      takeaway: "Fan of k rays × n cross-lines → n × k(k−1)/2 triangles.",
    };
  },
};

export const squareCountGenerator: Generator = {
  id: "count-squares",
  subtopic: "visual.figure-count",
  generate(seed) {
    const rng = new Rng(seedFor("count-squares", seed));
    const difficulty = (seed % 5) + 1;
    const n = Math.min(2 + Math.floor(difficulty / 2) + rng.int(0, 1), 5);
    const m = Math.max(2, Math.min(n + rng.int(-1, 1), 5));
    const cell = 220 / Math.max(n, m);
    let body = "";
    for (let i = 0; i <= n; i++) body += `<line x1="10" y1="${(10 + i * cell).toFixed(1)}" x2="${(10 + m * cell).toFixed(1)}" y2="${(10 + i * cell).toFixed(1)}" stroke-width="2.5"/>`;
    for (let j = 0; j <= m; j++) body += `<line x1="${(10 + j * cell).toFixed(1)}" y1="10" x2="${(10 + j * cell).toFixed(1)}" y2="${(10 + n * cell).toFixed(1)}" stroke-width="2.5"/>`;
    const correct = countSquaresGrid(n, m);
    const { options, answer } = numberOptions(rng, correct);
    const parts = Array.from({ length: Math.min(n, m) }, (_, i) => `${(n - i) * (m - i)} of size ${i + 1}×${i + 1}`);
    return {
      id: `gen-sq-${seed}`, generator: "count-squares", seed, subtopic: "visual.figure-count", difficulty,
      stem: `How many squares of ALL sizes are there in this ${n} × ${m} grid?`,
      stemSvg: svgDoc(20 + m * cell, 20 + n * cell, body, `A grid of ${n} rows and ${m} columns of squares`),
      options, answer,
      explanation: `Count by size: ${parts.join(", ")}. Total = ${correct}. The trap is counting only the small squares.`,
      takeaway: "Grid squares: add (n−k+1)(m−k+1) for every size k.",
    };
  },
};
