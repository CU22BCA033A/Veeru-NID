import { z } from "zod";

/** A previous-year question typed in by the mentor (the ONLY way an item can be labelled PYQ). */
export const pyqSchema = z.object({
  stem: z.string().trim().min(8),
  options: z.array(z.string().trim().min(1)).min(2).max(6).optional(),
  answer: z.string().trim().optional(), // letter: a/b/c/d…
  explanation: z.string().trim().min(5),
  subtopic: z.string(),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  year: z.string().trim().max(20).optional(),
  type: z.enum(["mcq", "short"]).default("mcq"),
});
export type PyqInput = z.infer<typeof pyqSchema>;

/** Minimal CSV parser (quoted fields, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** CSV columns: stem,a,b,c,d,answer,explanation,subtopic,difficulty,year (header row required). */
export function csvToPyqs(text: string): unknown[] {
  const [head, ...rows] = parseCsv(text);
  if (!head) return [];
  const idx = (name: string) => head.findIndex((h) => h.trim().toLowerCase() === name);
  return rows.map((r) => {
    const get = (n: string) => (idx(n) >= 0 ? r[idx(n)]?.trim() ?? "" : "");
    const options = ["a", "b", "c", "d", "e"].map(get).filter(Boolean);
    return {
      stem: get("stem"), options: options.length ? options : undefined, answer: get("answer").toLowerCase() || undefined,
      explanation: get("explanation"), subtopic: get("subtopic"), difficulty: get("difficulty") || 3, year: get("year") || undefined,
      type: options.length ? "mcq" : "short",
    };
  });
}
