import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

interface Frame {
  angle: number; // arrow direction in degrees (0 = up, clockwise)
  dots: number; // small dots in the corner
  marker: "circle" | "square" | "triangle";
}

const frameKey = (f: Frame) => `${((f.angle % 360) + 360) % 360}|${f.dots}|${f.marker}`;

function frameSvg(f: Frame, ox: number, size = 80): string {
  const c = size / 2, r = size * 0.32;
  const rad = (f.angle * Math.PI) / 180;
  const tx = c + r * Math.sin(rad), ty = c - r * Math.cos(rad);
  const h = (k: number) => [tx - 10 * Math.sin(rad + k), ty + 10 * Math.cos(rad + k)].map((v) => v.toFixed(1)).join(",");
  let s = `<rect x="${ox + 2}" y="2" width="${size - 4}" height="${size - 4}" rx="6" stroke-width="1.5" opacity="0.45"/>`;
  s += `<g transform="translate(${ox},0)"><line x1="${c}" y1="${c}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke-width="3"/><path d="M${h(0.45)} L${tx.toFixed(1)},${ty.toFixed(1)} L${h(-0.45)}" stroke-width="3"/>`;
  for (let i = 0; i < f.dots; i++) {
    const x = 10 + i * 9, y = size - 10;
    s +=
      f.marker === "circle" ? `<circle cx="${x}" cy="${y}" r="3.2" fill="currentColor" stroke="none"/>`
      : f.marker === "square" ? `<rect x="${x - 3}" y="${y - 3}" width="6.4" height="6.4" fill="currentColor" stroke="none"/>`
      : `<path d="M${x},${y - 4} L${x + 4},${y + 3} L${x - 4},${y + 3} Z" fill="currentColor" stroke="none"/>`;
  }
  return s + "</g>";
}

export const seriesGenerator: Generator = {
  id: "series",
  subtopic: "visual.series",
  generate(seed) {
    const rng = new Rng(seedFor("series", seed));
    const difficulty = (seed % 5) + 1;
    const step = rng.pick(difficulty <= 2 ? [90, -90] : [45, -45, 90, 135]);
    const start = rng.pick([0, 45, 90, 135, 180, 225, 270, 315]);
    const dotStep = difficulty >= 2 ? rng.pick([1, -1]) : 0;
    const dot0 = dotStep < 0 ? 5 : rng.int(1, 2);
    const markers = ["circle", "square", "triangle"] as const;
    const cycleMarkers = difficulty >= 4;
    const m0 = rng.int(0, 2);
    const frame = (k: number): Frame => ({
      angle: start + step * k,
      dots: dot0 + dotStep * k,
      marker: cycleMarkers ? markers[(m0 + k) % 3]! : markers[m0]!,
    });
    const answerFrame = frame(4);
    const wrongs: Frame[] = [
      { ...answerFrame, angle: answerFrame.angle - step },
      { ...answerFrame, angle: answerFrame.angle + 180 },
      { ...answerFrame, dots: Math.max(1, answerFrame.dots + (dotStep || 1)) },
      { ...answerFrame, dots: Math.max(1, answerFrame.dots - (dotStep || 1)) },
      { ...answerFrame, marker: markers[(markers.indexOf(answerFrame.marker) + 1) % 3]! },
    ];
    const options: Frame[] = [answerFrame];
    for (const w of rng.shuffle(wrongs)) {
      if (options.length === 4) break;
      if (w.dots >= 1 && !options.some((o) => frameKey(o) === frameKey(w))) options.push(w);
    }
    if (options.length < 4) return null;
    const order = rng.shuffle([0, 1, 2, 3]);
    let body = "";
    for (let k = 0; k < 4; k++) body += frameSvg(frame(k), k * 90);
    body += `<rect x="${4 * 90 + 2}" y="2" width="76" height="76" rx="6" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${4 * 90 + 40}" y="52" font-size="30" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">?</text>`;
    const rules = [`the arrow turns ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"} each step`];
    if (dotStep) rules.push(`the number of small marks ${dotStep > 0 ? "increases" : "decreases"} by 1`);
    if (cycleMarkers) rules.push("the mark shape cycles circle → square → triangle");
    return {
      id: `gen-series-${seed}`, generator: "series", seed, subtopic: "visual.series", difficulty,
      stem: "Which figure comes next in the series?",
      stemSvg: svgDoc(450, 80, body, "Four figures in a series followed by a question mark"),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: svgDoc(80, 80, frameSvg(options[ci]!, 0), `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: `Look at one element at a time: ${rules.join("; ")}. Apply every rule once more to the fourth figure to get the answer.`,
      takeaway: "Split a series into separate elements and find each one's rule.",
    };
  },
};
