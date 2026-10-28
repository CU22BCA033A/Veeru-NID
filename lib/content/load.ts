import taxonomy from "@/content/taxonomy.json";
import imagesJson from "@/content/images.json";
import { itemsFiles } from "@/content/index";
import { imageManifestSchema, itemFileSchema, type ImageSpec, type ItemInput } from "./schemas";

export function loadImageManifest(): ImageSpec[] {
  return imageManifestSchema.parse(imagesJson).images;
}

/** All authored items from content/items/*.json (throws on schema errors). */
export function loadAuthoredItems(): ItemInput[] {
  return itemsFiles.flatMap((file, i) => {
    const parsed = itemFileSchema.safeParse(file);
    if (!parsed.success) {
      throw new Error(`items file #${i}: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    }
    return parsed.data.items;
  });
}

/** subtopic id → category id */
export const SUBTOPICS: Map<string, string> = new Map(
  taxonomy.categories.flatMap((c) => c.subtopics.map((s) => [s.id, c.id] as [string, string])),
);
