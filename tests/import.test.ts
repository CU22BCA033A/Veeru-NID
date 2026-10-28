import { describe, expect, it } from "vitest";
import { csvToPyqs, parseCsv, pyqSchema } from "@/lib/content/import";

describe("PYQ import", () => {
  it("parses quoted CSV", () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([["a", "b, c", 'd "e"'], ["1", "2", "3"]]);
  });
  it("maps CSV rows to PYQs", () => {
    const rows = csvToPyqs('stem,a,b,c,d,answer,explanation,subtopic,difficulty,year\n"Which colour is warm?",Blue,Red,Green,Teal,b,Red is warm.,colour.temperature,1,2019');
    const p = pyqSchema.parse(rows[0]);
    expect(p.options).toHaveLength(4);
    expect(p.answer).toBe("b");
    expect(p.year).toBe("2019");
  });
});
