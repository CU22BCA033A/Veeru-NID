import type { ImageSpec, ItemInput } from "./schemas";
import { differsMeaningfully, itemContentHash, trigramSimilarity } from "./hash";

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

/** Cross-file checks the per-item schema can't do. */
export function validateContent(items: ItemInput[], images: ImageSpec[], subtopics: Map<string, string>): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const imageIds = new Set(images.map((i) => i.id));
  const ids = new Set<string>();
  const hashes = new Map<string, string>();

  for (const img of images) {
    if (ids.has(img.id)) errors.push(`duplicate image id ${img.id}`);
    ids.add(img.id);
  }
  ids.clear();

  for (const item of items) {
    if (ids.has(item.id)) errors.push(`duplicate item id ${item.id}`);
    ids.add(item.id);
    if (!subtopics.has(item.subtopic)) errors.push(`${item.id}: unknown subtopic ${item.subtopic}`);
    for (const img of item.imageIds) if (!imageIds.has(img)) errors.push(`${item.id}: unknown image ${img}`);
    const h = itemContentHash(item);
    const dup = hashes.get(h);
    if (dup) errors.push(`${item.id}: identical content to ${dup}`);
    hashes.set(h, item.id);
    if (item.variantOf && !items.some((i) => i.id === item.variantOf)) errors.push(`${item.id}: variantOf ${item.variantOf} not found`);
  }

  // Near-duplicates: only compare items that show the same pictures (or none), since the same
  // question about a different photo is a different question.
  const groups = new Map<string, ItemInput[]>();
  for (const item of items) {
    if (item.stemSvg) continue; // generated visuals are de-duplicated by content hash
    const key = [...item.imageIds].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!, b = group[j]!;
        if (trigramSimilarity(a.stem, b.stem) > 0.85 && !differsMeaningfully(a.stem, b.stem)) errors.push(`${a.id} and ${b.id} are near-duplicates`);
      }
    }
  }

  const used = new Set(items.flatMap((i) => i.imageIds));
  for (const img of images) if (!used.has(img.id)) warnings.push(`image ${img.id} is not used by any question`);
  return { errors, warnings };
}
