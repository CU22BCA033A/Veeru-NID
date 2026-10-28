import { describe, expect, it } from "vitest";
import { loadAuthoredItems, loadImageManifest, SUBTOPICS } from "@/lib/content/load";
import { validateContent } from "@/lib/content/validate";
import { itemSchema } from "@/lib/content/schemas";

describe("authored content", () => {
  const items = loadAuthoredItems();
  const images = loadImageManifest();

  it("passes cross-file validation", () => {
    const report = validateContent(items, images, SUBTOPICS);
    expect(report.errors).toEqual([]);
  });

  it("never labels authored items as PYQ", () => {
    expect(itemSchema.safeParse({ ...items[0], source: "PYQ" }).success).toBe(false);
  });

  it("every photo is used and image questions exist", () => {
    expect(validateContent(items, images, SUBTOPICS).warnings).toEqual([]);
    expect(items.filter((i) => i.imageIds.length > 0).length).toBeGreaterThanOrEqual(70);
  });
});

describe("content/index.ts", () => {
  it("is up to date (run `npm run content:index`)", async () => {
    const { readFileSync } = await import("node:fs");
    const { buildContentIndex } = await import("@/scripts/content-index");
    expect(readFileSync("content/index.ts", "utf8")).toBe(buildContentIndex());
  });
});
