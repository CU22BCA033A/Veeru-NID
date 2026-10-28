import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

const NAMES = ["Asha", "Ravi", "Meera", "Kiran", "Arjun", "Divya", "Farhan", "Lakshmi", "Neel", "Pooja", "Sameer", "Tanvi"];
const DIR_NAMES = ["North", "East", "South", "West"];
const DIAG: Record<string, string> = { "1,1": "North-East", "1,-1": "South-East", "-1,-1": "South-West", "-1,1": "North-West" };

export function directionFrom(dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return "At the start";
  if (dx === 0) return dy > 0 ? "North" : "South";
  if (dy === 0) return dx > 0 ? "East" : "West";
  return DIAG[`${Math.sign(dx)},${Math.sign(dy)}`]!;
}

export const directionGenerator: Generator = {
  id: "direction",
  subtopic: "visual.direction",
  generate(seed) {
    const rng = new Rng(seedFor("direction", seed));
    const difficulty = (seed % 5) + 1;
    const name = rng.pick(NAMES);
    let facing = rng.int(0, 3);
    let x = 0, y = 0;
    const legs = 2 + Math.min(difficulty, 3);
    const parts: string[] = [];
    for (let i = 0; i < legs; i++) {
      const dist = rng.int(1, 6) * (difficulty >= 4 ? 5 : 1);
      if (i === 0) parts.push(`walks ${dist} m ${DIR_NAMES[facing]}`);
      else {
        const turn = rng.pick(["left", "right"] as const);
        facing = (facing + (turn === "right" ? 1 : 3)) % 4;
        parts.push(`turns ${turn} and walks ${dist} m`);
      }
      const v = [[0, 1], [1, 0], [0, -1], [-1, 0]][facing]!;
      x += v[0]! * dist;
      y += v[1]! * dist;
    }
    const askDistance = difficulty <= 2 || (dirOk(x, y) && rng.chance(0.5));
    function dirOk(dx: number, dy: number) {
      return dx === 0 || dy === 0 || Math.hypot(dx, dy) % 1 === 0;
    }
    if (x === 0 && y === 0) return null;
    let correct: string;
    let pool: string[];
    if (askDistance && (x === 0 || y === 0 || Number.isInteger(Math.hypot(x, y)))) {
      const d = Math.hypot(x, y);
      correct = `${d} m`;
      pool = [`${Math.abs(x) + Math.abs(y)} m`, `${d + 5} m`, `${Math.max(1, d - 2)} m`, `${d * 2} m`, `${Math.abs(Math.abs(x) - Math.abs(y)) || d + 3} m`];
    } else {
      correct = directionFrom(x, y);
      pool = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
    }
    const wrong = rng.shuffle([...new Set(pool.filter((p) => p !== correct))]).slice(0, 3);
    if (wrong.length < 3) return null;
    const values = rng.shuffle([correct, ...wrong]);
    const isDist = correct.endsWith(" m");
    return {
      id: `gen-direction-${seed}`, generator: "direction", seed, subtopic: "visual.direction", difficulty,
      stem: `${name} ${parts.join(", then ")}. ${isDist ? `How far is ${name} now from the starting point (in a straight line)?` : `In which direction is ${name} now from the starting point?`}`,
      options: values.map((v, i) => ({ id: OPTION_IDS[i]!, text: v })),
      answer: OPTION_IDS[values.indexOf(correct)]!,
      explanation: `Sketch it. Taking East as +x and North as +y, the final position is (${x}, ${y}) m from the start. ${isDist ? `Straight-line distance = √(${x}² + ${y}²) = ${correct}.` : `That point lies to the ${correct} of the start.`} Remember that 'turn right' depends on which way you are facing at that moment.`,
      takeaway: "Always draw direction problems; track facing after every turn.",
    };
  },
};

export const codingGenerator: Generator = {
  id: "coding",
  subtopic: "visual.coding",
  generate(seed) {
    const rng = new Rng(seedFor("coding", seed));
    const difficulty = (seed % 5) + 1;
    const words = ["DESIGN", "COLOUR", "SKETCH", "PENCIL", "CANVAS", "SHADOW", "FORM", "LINE", "SHAPE", "BRUSH", "CRAFT", "TEXTURE", "PATTERN", "MOTIF", "POSTER", "SYMBOL", "MODEL", "CLAY", "PAPER", "STUDIO", "LIGHT", "SPACE", "RHYTHM", "BALANCE", "CONTRAST"];
    const [w1, w2] = rng.shuffle(words).slice(0, 2) as [string, string];
    const shift = rng.pick(difficulty <= 2 ? [1, 2, -1] : [2, 3, -2, -3]);
    const reverse = difficulty >= 4 && rng.chance(0.5);
    const enc = (w: string) => {
      const s = [...w].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift + 26) % 26) + 65)).join("");
      return reverse ? [...s].reverse().join("") : s;
    };
    const correct = enc(w2);
    const plain = [...w2].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift + 26) % 26) + 65)).join("");
    const wrongCands = [
      [...w2].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 - shift + 26) % 26) + 65)).join(""),
      reverse ? plain : [...correct].reverse().join(""),
      [...w2].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift + (shift > 0 ? 1 : -1) + 26) % 26) + 65)).join(""),
    ].filter((w) => w !== correct);
    if (new Set(wrongCands).size < 3) return null;
    const values = rng.shuffle([correct, ...wrongCands]);
    return {
      id: `gen-coding-${seed}`, generator: "coding", seed, subtopic: "visual.coding", difficulty,
      stem: `In a certain code, ${w1} is written as ${enc(w1)}. How is ${w2} written in that code?`,
      options: values.map((v, i) => ({ id: OPTION_IDS[i]!, text: v })),
      answer: OPTION_IDS[values.indexOf(correct)]!,
      explanation: `Compare letter by letter: each letter moves ${Math.abs(shift)} place${Math.abs(shift) > 1 ? "s" : ""} ${shift > 0 ? "forward" : "backward"} in the alphabet${reverse ? ", and then the whole word is written backwards" : ""}. Applying the same rule to ${w2} gives ${correct}.`,
      takeaway: "Write the alphabet positions; check for a shift, then for reversal.",
    };
  },
};

type ShapeName = "circle" | "square" | "triangle" | "diamond";
function marker(shape: ShapeName, cx: number, cy: number, filled: boolean): string {
  const f = filled ? `fill="currentColor"` : "";
  switch (shape) {
    case "circle": return `<circle cx="${cx}" cy="${cy}" r="7" stroke-width="2" ${f}/>`;
    case "square": return `<rect x="${cx - 7}" y="${cy - 7}" width="14" height="14" stroke-width="2" ${f}/>`;
    case "triangle": return `<path d="M${cx},${cy - 8} L${cx + 8},${cy + 7} L${cx - 8},${cy + 7} Z" stroke-width="2" ${f}/>`;
    case "diamond": return `<path d="M${cx},${cy - 9} L${cx + 8},${cy} L${cx},${cy + 9} L${cx - 8},${cy} Z" stroke-width="2" ${f}/>`;
  }
}
function cellSvg(shape: ShapeName, count: number, filled: boolean, ox: number, oy: number): string {
  let s = `<rect x="${ox + 2}" y="${oy + 2}" width="66" height="66" rx="6" stroke-width="1.2" opacity="0.4"/>`;
  const pos = [[35, 35], [22, 22, 48, 48], [20, 20, 50, 20, 35, 50], [22, 22, 48, 22, 22, 48, 48, 48]][count - 1]!;
  for (let i = 0; i < pos.length; i += 2) s += marker(shape, ox + pos[i]!, oy + pos[i + 1]!, filled);
  return s;
}

export const matrixGenerator: Generator = {
  id: "matrix",
  subtopic: "visual.pattern",
  generate(seed) {
    const rng = new Rng(seedFor("matrix", seed));
    const difficulty = (seed % 5) + 1;
    const shapes = rng.shuffle<ShapeName>(["circle", "square", "triangle", "diamond"]);
    const counts = difficulty >= 3 ? rng.shuffle([1, 2, 3]) : [1, 2, 3];
    const fillRule = difficulty >= 3;
    const cell = (r: number, c: number) => ({ shape: shapes[r]!, count: counts[c]!, filled: fillRule ? (r + c) % 2 === 0 : false });
    let body = "";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) body += `<rect x="${c * 72 + 2}" y="${r * 72 + 2}" width="66" height="66" rx="6" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${c * 72 + 35}" y="${r * 72 + 45}" font-size="26" text-anchor="middle" fill="currentColor" stroke="none">?</text>`;
      else { const k = cell(r, c); body += cellSvg(k.shape, k.count, k.filled, c * 72, r * 72); }
    }
    const ans = cell(2, 2);
    const cands = [ans, { ...ans, shape: shapes[3]! }, { ...ans, count: counts[1]! }, { ...ans, filled: !ans.filled }, { ...ans, shape: shapes[1]! }];
    const opts: typeof ans[] = [];
    for (const c of cands) if (opts.length < 4 && !opts.some((o) => o.shape === c.shape && o.count === c.count && o.filled === c.filled)) opts.push(c);
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      id: `gen-matrix-${seed}`, generator: "matrix", seed, subtopic: "visual.pattern", difficulty,
      stem: "Which figure completes the pattern?",
      stemSvg: svgDoc(216, 216, body, "A three by three grid of figures with the last one missing"),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: svgDoc(70, 70, cellSvg(opts[ci]!.shape, opts[ci]!.count, opts[ci]!.filled, 0, 0), `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: `Read the rows and columns separately: each ROW keeps the same shape (row 3: ${shapes[2]}s), and each COLUMN keeps the same number of marks (column 3: ${counts[2]})${fillRule ? "; filled and outlined cells alternate like a chessboard" : ""}. So the missing cell has ${counts[2]} ${shapes[2]}${counts[2]! > 1 ? "s" : ""}${fillRule ? `, ${ans.filled ? "filled" : "outlined"}` : ""}.`,
      takeaway: "Matrix puzzles: one rule per row, one per column, sometimes one diagonal.",
    };
  },
};
