"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { csvToPyqs, pyqSchema } from "@/lib/content/import";
import { itemContentHash } from "@/lib/content/hash";
import { SUBTOPICS } from "@/lib/content/load";
import { supabaseServer } from "@/lib/supabase/server";

const editSchema = z.object({
  id: z.string().max(80),
  stem: z.string().trim().min(8),
  explanation: z.string().trim().min(5),
  takeaway: z.string().trim().max(300),
  status: z.enum(["live", "retired", "draft"]),
  needsReview: z.boolean(),
});

export async function saveItem(input: z.infer<typeof editSchema>): Promise<{ error?: string }> {
  await requireViewer("mentor");
  const d = editSchema.parse(input);
  const db = await supabaseServer();
  const { error } = await db.from("items").update({ stem: d.stem, explanation: d.explanation, takeaway: d.takeaway || null, status: d.status, needs_review: d.needsReview }).eq("id", d.id);
  if (error) return { error: error.message };
  await db.from("item_reports").update({ status: "fixed" }).eq("item_id", d.id).eq("status", "open");
  revalidatePath("/admin/content");
  return {};
}

export async function dismissReport(id: string) {
  await requireViewer("mentor");
  const db = await supabaseServer();
  await db.from("item_reports").update({ status: "dismissed" }).eq("id", z.string().uuid().parse(id));
  revalidatePath("/admin/content");
}

/** Import previous-year questions (from books/papers the mentor owns). Rejects near-duplicates. */
export async function importPyqs(_prev: { message: string | null }, form: FormData): Promise<{ message: string | null }> {
  await requireViewer("mentor");
  const text = String(form.get("data") ?? "").trim();
  if (!text) return { message: "Paste CSV or JSON first." };
  let raw: unknown[];
  try {
    raw = text.startsWith("[") ? (JSON.parse(text) as unknown[]) : csvToPyqs(text);
  } catch {
    return { message: "Couldn't read that. Check the CSV header or JSON format." };
  }
  const db = await supabaseServer();
  const results = { added: 0, duplicates: [] as string[], invalid: [] as string[] };
  for (const [i, r] of raw.entries()) {
    const p = pyqSchema.safeParse(r);
    if (!p.success || !SUBTOPICS.has(p.data.subtopic)) {
      results.invalid.push(`row ${i + 1}${p.success ? `: unknown subtopic ${p.data.subtopic}` : ""}`);
      continue;
    }
    const d = p.data;
    const { data: similar } = await db.rpc("similar_items", { q: d.stem, threshold: 0.85 });
    if ((similar ?? []).length) {
      results.duplicates.push(`row ${i + 1}`);
      continue;
    }
    const options = d.options?.map((t, k) => ({ id: "abcdef"[k]!, text: t }));
    if (d.type === "mcq" && (!options || !d.answer || !options.some((o) => o.id === d.answer))) {
      results.invalid.push(`row ${i + 1}: answer must be one of the option letters`);
      continue;
    }
    const hash = itemContentHash({ stem: d.stem, options, imageIds: [] });
    const id = `pyq-${createHash("sha1").update(hash).digest("hex").slice(0, 10)}`;
    const { error } = await db.from("items").insert({
      id, type: d.type, category_id: SUBTOPICS.get(d.subtopic)!, subtopic_id: d.subtopic, difficulty: d.difficulty, source: "PYQ",
      pattern_ref: d.year ? `NID ${d.year} (memory-based)` : null, stem: d.stem, options: options ?? null, answer: d.type === "mcq" ? d.answer : null,
      explanation: d.explanation, tags: ["pyq", ...(d.year ? [d.year] : [])], status: "live", content_hash: hash,
    });
    if (error) results.invalid.push(`row ${i + 1}: ${error.message}`);
    else results.added++;
  }
  revalidatePath("/admin/content");
  return {
    message: `Added ${results.added}. ${results.duplicates.length ? `Skipped ${results.duplicates.length} near-duplicates (${results.duplicates.slice(0, 5).join(", ")}). ` : ""}${results.invalid.length ? `Invalid: ${results.invalid.slice(0, 5).join("; ")}.` : ""}`,
  };
}
