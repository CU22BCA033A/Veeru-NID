import { Rng, seedFor } from "./rng";
import { svgDoc } from "./svg";
import { OPTION_IDS, type Generator } from "./types";

/** Traditional 12-step RYB painter's wheel. */
export const RYB_WHEEL = [
  ["red", "#FE2712"], ["red-orange", "#FC600A"], ["orange", "#FB9902"], ["yellow-orange", "#FCCC1A"],
  ["yellow", "#FEFE33"], ["yellow-green", "#B2D732"], ["green", "#66B032"], ["blue-green", "#347C98"],
  ["blue", "#0247FE"], ["blue-violet", "#4424D6"], ["violet", "#8601AF"], ["red-violet", "#C21460"],
] as const;

const HARMONIES = {
  Complementary: [0, 6],
  Analogous: [0, 1, 2],
  Triadic: [0, 4, 8],
  "Split-complementary": [0, 5, 7],
} as const;

export const colourHarmonyGenerator: Generator = {
  id: "colour-harmony",
  subtopic: "colour.harmony",
  generate(seed) {
    const rng = new Rng(seedFor("colour-harmony", seed));
    const difficulty = 2 + (seed % 3);
    const names = Object.keys(HARMONIES) as (keyof typeof HARMONIES)[];
    const harmony = names[seed % names.length]!;
    const base = rng.int(0, 11);
    const idx = HARMONIES[harmony].map((o) => (base + o) % 12);
    const swatches = rng.shuffle(idx);
    const body = swatches
      .map((i, k) => `<rect x="${10 + k * 90}" y="10" width="80" height="80" rx="10" fill="${RYB_WHEEL[i]![1]}" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>`)
      .join("");
    const order = rng.shuffle(names);
    const colourNames = swatches.map((i) => RYB_WHEEL[i]![0]);
    return {
      id: `gen-harmony-${seed}`, generator: "colour-harmony", seed, subtopic: "colour.harmony", difficulty,
      stem: "Which colour harmony does this palette follow on the traditional (red–yellow–blue) colour wheel?",
      stemSvg: svgDoc(20 + swatches.length * 90, 100, body, `Colour swatches: ${colourNames.join(", ")}`),
      options: order.map((n, i) => ({ id: OPTION_IDS[i]!, text: n })),
      answer: OPTION_IDS[order.indexOf(harmony)]!,
      explanation: `The colours are ${colourNames.join(", ")}. ${
        harmony === "Complementary" ? "They sit directly opposite each other on the wheel."
        : harmony === "Analogous" ? "They sit next to each other on the wheel."
        : harmony === "Triadic" ? "They are evenly spaced, a third of the wheel apart (like a triangle)."
        : "One colour plus the two colours on either side of its complement."
      }`,
      takeaway: "Opposite = complementary; neighbours = analogous; triangle = triadic; Y-shape = split-complementary.",
    };
  },
};

const ILLUSIONS = ["muller-lyer", "ebbinghaus", "ponzo", "vertical-horizontal"] as const;

export const illusionGenerator: Generator = {
  id: "illusion",
  subtopic: "visual.illusion",
  generate(seed) {
    const rng = new Rng(seedFor("illusion", seed));
    const kind = ILLUSIONS[seed % ILLUSIONS.length]!;
    const difficulty = 2;
    let body = "", stem = "", name = "", why = "";
    const opts = ["A is longer/larger", "B is longer/larger", "They are equal", "It depends on the screen"];
    if (kind === "muller-lyer") {
      const L = rng.int(120, 170), x0 = 40, wing = rng.int(14, 22);
      const line = (y: number, out: boolean, label: string) => {
        const d = out ? -wing : wing;
        return `<line x1="${x0}" y1="${y}" x2="${x0 + L}" y2="${y}" stroke-width="3"/><path d="M${x0 - d},${y - wing} L${x0},${y} L${x0 - d},${y + wing}" stroke-width="3"/><path d="M${x0 + L + d},${y - wing} L${x0 + L},${y} L${x0 + L + d},${y + wing}" stroke-width="3"/><text x="10" y="${y + 5}" font-size="16" fill="currentColor" stroke="none">${label}</text>`;
      };
      body = line(40, true, "A") + line(110, false, "B");
      stem = "Compare the two horizontal lines A and B (ignore the arrow-heads). Which is longer?";
      name = "Müller-Lyer illusion";
      why = "Outward-pointing fins make a line look longer and inward arrow-heads make it look shorter, even though the shafts are identical.";
    } else if (kind === "ebbinghaus") {
      const r = rng.int(16, 22);
      const ring = (cx: number, big: boolean) =>
        Array.from({ length: big ? 6 : 8 }, (_, i) => {
          const a = (i / (big ? 6 : 8)) * Math.PI * 2, d = big ? r + 34 : r + 14;
          return `<circle cx="${(cx + d * Math.cos(a)).toFixed(1)}" cy="${(90 + d * Math.sin(a)).toFixed(1)}" r="${big ? 24 : 7}" stroke-width="2"/>`;
        }).join("");
      body = `<circle cx="90" cy="90" r="${r}" fill="currentColor" fill-opacity="0.5" stroke="none"/>${ring(90, true)}<circle cx="260" cy="90" r="${r}" fill="currentColor" fill-opacity="0.5" stroke="none"/>${ring(260, false)}<text x="84" y="175" font-size="16" fill="currentColor" stroke="none">A</text><text x="254" y="175" font-size="16" fill="currentColor" stroke="none">B</text>`;
      stem = "Compare the two filled centre circles A and B. Which is larger?";
      name = "Ebbinghaus illusion";
      why = "A circle surrounded by big circles looks smaller, and one surrounded by small circles looks bigger. We judge size relative to the surroundings.";
    } else if (kind === "ponzo") {
      const L = rng.int(60, 80);
      body = `<line x1="80" y1="180" x2="150" y2="10" stroke-width="2.5"/><line x1="240" y1="180" x2="170" y2="10" stroke-width="2.5"/><line x1="${160 - L / 2}" y1="50" x2="${160 + L / 2}" y2="50" stroke-width="5"/><line x1="${160 - L / 2}" y1="160" x2="${160 + L / 2}" y2="160" stroke-width="5"/><text x="${160 + L / 2 + 8}" y="55" font-size="16" fill="currentColor" stroke="none">A</text><text x="${160 + L / 2 + 8}" y="165" font-size="16" fill="currentColor" stroke="none">B</text>`;
      stem = "Compare the two thick horizontal bars A (top) and B (bottom). Which is longer?";
      name = "Ponzo illusion";
      why = "The converging lines read as perspective, like railway tracks, so the top bar seems further away, and the brain enlarges it.";
    } else {
      const L = rng.int(110, 140);
      body = `<line x1="${170 - L / 2}" y1="170" x2="${170 + L / 2}" y2="170" stroke-width="4"/><line x1="170" y1="170" x2="170" y2="${170 - L}" stroke-width="4"/><text x="${170 + L / 2 + 6}" y="175" font-size="16" fill="currentColor" stroke="none">A</text><text x="178" y="${180 - L}" font-size="16" fill="currentColor" stroke="none">B</text>`;
      stem = "Compare the horizontal line A and the vertical line B. Which is longer?";
      name = "Vertical–horizontal illusion";
      why = "We tend to overestimate vertical lengths, especially when the vertical line bisects the horizontal one.";
    }
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      id: `gen-illusion-${seed}`, generator: "illusion", seed, subtopic: "visual.illusion", difficulty,
      stem, stemSvg: svgDoc(340, 190, body, name),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, text: opts[ci]! })),
      answer: OPTION_IDS[order.indexOf(2)]!,
      explanation: `They are exactly equal. This is the ${name}: ${why} Designers use such effects deliberately, and must correct for them (e.g. making a circle slightly bigger than a square so they LOOK the same size in a logo).`,
      takeaway: "Perception ≠ measurement. Context changes how size is seen.",
    };
  },
};
