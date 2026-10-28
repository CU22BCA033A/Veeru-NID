import { describe, expect, it } from "vitest";
import { apply, homography, outputSize } from "@/lib/image/homography";

describe("homography", () => {
  it("maps the four corners exactly", () => {
    const src = [{ x: 30, y: 40 }, { x: 900, y: 20 }, { x: 950, y: 1300 }, { x: 10, y: 1250 }];
    const dst = [{ x: 0, y: 0 }, { x: 1131, y: 0 }, { x: 1131, y: 1600 }, { x: 0, y: 1600 }];
    const h = homography(dst, src); // inverse map: output pixel → source pixel
    dst.forEach((p, i) => {
      const q = apply(h, p);
      expect(q.x).toBeCloseTo(src[i]!.x, 6);
      expect(q.y).toBeCloseTo(src[i]!.y, 6);
    });
  });
  it("chooses A-series portrait/landscape", () => {
    expect(outputSize([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 140 }, { x: 0, y: 140 }])).toEqual({ w: 1131, h: 1600 });
    expect(outputSize([{ x: 0, y: 0 }, { x: 140, y: 0 }, { x: 140, y: 100 }, { x: 0, y: 100 }])).toEqual({ w: 1600, h: 1131 });
  });
});
