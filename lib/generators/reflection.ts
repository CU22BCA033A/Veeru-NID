import { T, transform, type Figure } from "./geometry";
import { randomAsymmetricFigure } from "./figure";
import { Rng, seedFor } from "./rng";
import { figureSvg, inner, svgDoc } from "./svg";
import { OPTION_IDS, type GeneratedItem, type Generator } from "./types";

function difficultyFor(seed: number) {
  return (seed % 5) + 1;
}

function withMirrorLine(fig: Figure, label: string, axis: "vertical" | "horizontal"): string {
  // question figure + the mirror line drawn beside it
  const fig120 = inner(figureSvg(fig, label, { px: 120 }));
  const line =
    axis === "vertical"
      ? `<line x1="132" y1="4" x2="132" y2="116" stroke-width="3" stroke-dasharray="6 5"/><text x="138" y="16" font-size="12" fill="currentColor" stroke="none">M</text><text x="138" y="116" font-size="12" fill="currentColor" stroke="none">N</text>`
      : `<line x1="4" y1="132" x2="116" y2="132" stroke-width="3" stroke-dasharray="6 5"/><text x="4" y="148" font-size="12" fill="currentColor" stroke="none">M</text><text x="104" y="148" font-size="12" fill="currentColor" stroke="none">N</text>`;
  return axis === "vertical" ? svgDoc(150, 120, fig120 + line, label) : svgDoc(120, 152, fig120 + line, label);
}

function build(kind: "mirror" | "water", seed: number): GeneratedItem {
  const id = kind === "mirror" ? "mirror-image" : "water-image";
  const rng = new Rng(seedFor(id, seed));
  const difficulty = difficultyFor(seed);
  const fig = randomAsymmetricFigure(rng, difficulty);
  const correctT = kind === "mirror" ? T.mirrorV : T.mirrorH;
  const wrong = kind === "mirror" ? [T.mirrorH, T.rot180, T.identity] : [T.mirrorV, T.rot180, T.identity];
  const candidates = [correctT, ...wrong];
  const order = rng.shuffle([0, 1, 2, 3]);
  const options = order.map((ci, i) => ({
    id: OPTION_IDS[i]!,
    svg: figureSvg(transform(fig, candidates[ci]!), `Option ${OPTION_IDS[i]!.toUpperCase()}`),
  }));
  const answer = OPTION_IDS[order.indexOf(0)]!;
  return kind === "mirror"
    ? {
        id: `gen-mirror-${seed}`, generator: id, seed, subtopic: "visual.mirror", difficulty,
        stem: "A mirror is placed along the dashed line MN on the right of the figure. Which option shows its mirror image?",
        stemSvg: withMirrorLine(fig, "Question figure with a vertical mirror line on its right", "vertical"),
        options, answer,
        explanation: "A vertical mirror swaps left and right but keeps top and bottom the same. Check one corner: whatever is on the far left of the figure must appear on the far right of the image, at the same height. The other options flip top-to-bottom (water image), turn the figure upside-down (180° rotation) or don't change it.",
        takeaway: "Vertical mirror: left↔right, height unchanged.",
      }
    : {
        id: `gen-water-${seed}`, generator: id, seed, subtopic: "visual.water", difficulty,
        stem: "The dashed line MN is the surface of water below the figure. Which option shows its water image (reflection)?",
        stemSvg: withMirrorLine(fig, "Question figure with a horizontal water line below it", "horizontal"),
        options, answer,
        explanation: "A water image flips top and bottom but keeps left and right the same. Pick a distinctive part (like the dot): it stays on the same side but moves from top to bottom or the other way. The distractors flip left-right (mirror image), rotate 180°, or don't change it.",
        takeaway: "Water image: top↔bottom, sides unchanged.",
      };
}

export const mirrorGenerator: Generator = { id: "mirror-image", subtopic: "visual.mirror", generate: (s) => build("mirror", s) };
export const waterGenerator: Generator = { id: "water-image", subtopic: "visual.water", generate: (s) => build("water", s) };

export const rotationGenerator: Generator = {
  id: "rotation",
  subtopic: "visual.rotation",
  generate(seed) {
    const rng = new Rng(seedFor("rotation", seed));
    const difficulty = difficultyFor(seed);
    const fig = randomAsymmetricFigure(rng, difficulty);
    const clockwise = rng.chance(0.5);
    const correct = clockwise ? T.rot90cw : T.rot90ccw;
    const wrong = clockwise ? [T.rot90ccw, T.rot180, T.mirrorV] : [T.rot90cw, T.rot180, T.mirrorH];
    const cands = [correct, ...wrong];
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      id: `gen-rotation-${seed}`, generator: "rotation", seed, subtopic: "visual.rotation", difficulty,
      stem: `Which option shows the figure rotated 90° ${clockwise ? "clockwise" : "anticlockwise"}?`,
      stemSvg: figureSvg(fig, "Question figure"),
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: figureSvg(transform(fig, cands[ci]!), `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: `Track one feature, like the dot. In a 90° ${clockwise ? "clockwise" : "anticlockwise"} turn, what was at the top moves to the ${clockwise ? "right" : "left"}, and what was on the right moves to the ${clockwise ? "bottom" : "top"}. A rotation never produces a mirror image, so any option that is 'flipped' can be ruled out immediately.`,
      takeaway: "Rotations keep handedness; mirror images don't.",
    };
  },
};

export const oddOneOutGenerator: Generator = {
  id: "odd-one-out",
  subtopic: "visual.odd-one",
  generate(seed) {
    const rng = new Rng(seedFor("odd-one-out", seed));
    const difficulty = difficultyFor(seed);
    const fig = randomAsymmetricFigure(rng, difficulty);
    // three rotations of the same figure and one mirror image
    const rotations = rng.shuffle([T.identity, T.rot90cw, T.rot90ccw, T.rot180]).slice(0, 3);
    const odd = transform(transform(fig, T.mirrorV), rng.pick([T.identity, T.rot90cw, T.rot180]));
    const figs = [odd, ...rotations.map((t) => transform(fig, t))];
    const order = rng.shuffle([0, 1, 2, 3]);
    return {
      id: `gen-odd-${seed}`, generator: "odd-one-out", seed, subtopic: "visual.odd-one", difficulty,
      stem: "Three of these figures are the same figure turned to different positions. Which one is different?",
      options: order.map((ci, i) => ({ id: OPTION_IDS[i]!, svg: figureSvg(figs[ci]!, `Option ${OPTION_IDS[i]!.toUpperCase()}`) })),
      answer: OPTION_IDS[order.indexOf(0)]!,
      explanation: "Rotating a figure never changes its 'handedness'. The odd one out is a mirror image: no matter how you turn it, it can't be made to match the others. Imagine rotating each option until the dot is in the same place, then compare the rest of the lines.",
      takeaway: "Odd one out among rotations = the mirrored one.",
    };
  },
};
