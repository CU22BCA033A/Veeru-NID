import { itemContentHash } from "@/lib/content/hash";
import { colourHarmonyGenerator, illusionGenerator } from "./colour-illusion";
import { triangleCountGenerator, squareCountGenerator } from "./counting";
import { cubeNetGenerator, diceGenerator } from "./cube";
import { embeddedGenerator } from "./embedded";
import { codingGenerator, directionGenerator, matrixGenerator } from "./logic";
import { orthoGenerator } from "./ortho";
import { paperFoldGenerator } from "./paperfold";
import { mirrorGenerator, oddOneOutGenerator, rotationGenerator, waterGenerator } from "./reflection";
import { seriesGenerator } from "./series";
import type { GeneratedItem, Generator } from "./types";

/** Every generator, with how many unique puzzles to keep in the pool. */
export const GENERATORS: { gen: Generator; pool: number }[] = [
  { gen: mirrorGenerator, pool: 520 },
  { gen: waterGenerator, pool: 520 },
  { gen: rotationGenerator, pool: 440 },
  { gen: oddOneOutGenerator, pool: 400 },
  { gen: paperFoldGenerator, pool: 520 },
  { gen: cubeNetGenerator, pool: 400 },
  { gen: diceGenerator, pool: 160 },
  { gen: triangleCountGenerator, pool: 150 },
  { gen: squareCountGenerator, pool: 10 },
  { gen: seriesGenerator, pool: 480 },
  { gen: embeddedGenerator, pool: 420 },
  { gen: orthoGenerator, pool: 440 },
  { gen: matrixGenerator, pool: 168 },
  { gen: directionGenerator, pool: 320 },
  { gen: codingGenerator, pool: 320 },
  { gen: colourHarmonyGenerator, pool: 100 },
  { gen: illusionGenerator, pool: 12 },
];

/**
 * Deterministically build the puzzle pool. Seeds are tried in order; puzzles whose content
 * hash matches an earlier one are skipped, so the pool never contains repeats.
 */
export function buildGeneratedPool(scale = 1): (GeneratedItem & { contentHash: string })[] {
  const out: (GeneratedItem & { contentHash: string })[] = [];
  const seen = new Set<string>();
  for (const { gen, pool } of GENERATORS) {
    const target = Math.max(1, Math.round(pool * scale));
    let made = 0;
    for (let seed = 1; made < target && seed < target * 20; seed++) {
      const item = gen.generate(seed);
      if (!item) continue;
      const contentHash = itemContentHash({ stem: item.stem, stemSvg: item.stemSvg, options: item.options, imageIds: [] });
      // The question (stem + picture) defines a puzzle; reshuffled options don't make it new.
      // (When there is no question picture, the options are the question, e.g. odd-one-out.)
      const questionKey = item.stemSvg ? itemContentHash({ stem: item.stem, stemSvg: item.stemSvg, options: [], imageIds: [] }) : contentHash;
      if (seen.has(questionKey)) continue;
      seen.add(questionKey);
      out.push({ ...item, contentHash });
      made++;
    }
  }
  return out;
}

export type { GeneratedItem, Generator };
