import { describe, expect, it } from "vitest";
import { buildGeneratedPool, GENERATORS } from "@/lib/generators";
import { countSquaresGrid, countTrianglesFan } from "@/lib/generators/counting";
import { CUBE_NETS, foldNet } from "@/lib/generators/cube";
import { T, transform, sameFigure } from "@/lib/generators/geometry";
import { randomAsymmetricFigure } from "@/lib/generators/figure";
import { frontView, sideViewFromRight } from "@/lib/generators/ortho";
import { unfold } from "@/lib/generators/paperfold";
import { directionFrom } from "@/lib/generators/logic";
import { Rng } from "@/lib/generators/rng";

describe("geometry", () => {
  it("transforms compose correctly", () => {
    const fig = randomAsymmetricFigure(new Rng(7), 3);
    expect(sameFigure(transform(transform(fig, T.mirrorV), T.mirrorV), fig)).toBe(true);
    expect(sameFigure(transform(transform(fig, T.rot90cw), T.rot90ccw), fig)).toBe(true);
    expect(sameFigure(transform(transform(fig, T.mirrorV), T.mirrorH), transform(fig, T.rot180))).toBe(true);
    expect(sameFigure(transform(fig, T.mirrorV), fig)).toBe(false);
  });
});

describe("counting", () => {
  it("matches classic answers", () => {
    expect(countTrianglesFan(0, 1)).toBe(1); // plain triangle
    expect(countTrianglesFan(2, 2)).toBe(12); // two lines from apex + one cross line
    expect(countSquaresGrid(2, 2)).toBe(5);
    expect(countSquaresGrid(3, 3)).toBe(14);
    expect(countSquaresGrid(4, 4)).toBe(30);
  });
});

describe("cube nets", () => {
  it("all 11 nets fold into a cube", () => {
    for (const net of CUBE_NETS) {
      const normals = foldNet(net).map((v) => v.join(","));
      expect(new Set(normals).size).toBe(6);
    }
  });
  it("cross net has the known opposite faces", () => {
    const net = CUBE_NETS[0]!; // [1,0],[0,1],[1,1],[2,1],[3,1],[1,2]
    const n = foldNet(net).map((v) => v.join(","));
    const opp = (i: number, j: number) => n[i]!.split(",").map(Number).every((c, k) => c === -Number(n[j]!.split(",")[k]));
    expect(opp(2, 4)).toBe(true); // centre (1,1) ↔ (3,1)
    expect(opp(1, 3)).toBe(true); // (0,1) ↔ (2,1)
    expect(opp(0, 5)).toBe(true); // (1,0) ↔ (1,2)
  });
});

describe("paper folding", () => {
  it("two folds make four symmetric holes", () => {
    const holes = unfold([{ x: 2.5, y: 2.5 }], ["left-over-right", "top-over-bottom"]);
    expect(holes.map((h) => `${h.x},${h.y}`).sort()).toEqual(["1.5,1.5", "1.5,2.5", "2.5,1.5", "2.5,2.5"]);
  });
  it("diagonal fold mirrors across the diagonal", () => {
    expect(unfold([{ x: 3.5, y: 0.5 }], ["diagonal"]).map((h) => `${h.x},${h.y}`).sort()).toEqual(["0.5,3.5", "3.5,0.5"]);
  });
});

describe("views", () => {
  it("front and side views take the tallest block along each line of sight", () => {
    const h = [[1, 0, 3], [2, 2, 0], [0, 1, 1]];
    expect(frontView(h)).toEqual([3, 2, 1]);
    expect(sideViewFromRight(h)).toEqual([2, 2, 3]);
  });
});

describe("directions", () => {
  it("names compass directions", () => {
    expect(directionFrom(3, 4)).toBe("North-East");
    expect(directionFrom(-2, 0)).toBe("West");
    expect(directionFrom(0, -5)).toBe("South");
  });
});

describe("every generator", () => {
  for (const { gen } of GENERATORS) {
    it(`${gen.id}: valid, deterministic, unambiguous`, () => {
      let made = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const a = gen.generate(seed);
        if (!a) continue;
        made++;
        expect(gen.generate(seed)).toEqual(a);
        expect(a.options).toHaveLength(4);
        expect(a.options.map((o) => o.id)).toContain(a.answer);
        const faces = a.options.map((o) => (o.svg ?? "").replace(/aria-label="[^"]*"/, "") + (o.text ?? ""));
        expect(new Set(faces).size).toBe(4); // no two options look the same
        expect(a.explanation.length).toBeGreaterThan(40);
      }
      expect(made).toBeGreaterThan(gen.id === "illusion" ? 10 : 30);
    });
  }

  it("dice views never show two opposite faces together", () => {
    const dice = GENERATORS.find((g) => g.gen.id === "dice")!.gen;
    for (let seed = 1; seed <= 100; seed++) {
      const item = dice.generate(seed)!;
      const label = item.stemSvg!.match(/aria-label="([^"]+)"/)![1]!;
      for (const view of label.match(/\d, \d, \d/g)!) {
        const n = view.split(", ").map(Number);
        expect(n[0]! + n[1]!).not.toBe(7);
        expect(n[0]! + n[2]!).not.toBe(7);
        expect(n[1]! + n[2]!).not.toBe(7);
      }
    }
  });
});

describe("pool", () => {
  it("has thousands of unique puzzles", () => {
    const pool = buildGeneratedPool();
    expect(pool.length).toBeGreaterThan(5300);
    expect(new Set(pool.map((p) => p.id)).size).toBe(pool.length);
    expect(new Set(pool.map((p) => p.contentHash)).size).toBe(pool.length);
  }, 60_000);
});
