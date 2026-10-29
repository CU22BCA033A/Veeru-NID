"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { loadImageManifest } from "@/lib/content/load";
import { supabaseServer } from "@/lib/supabase/server";

/** Accept what people paste: missing "https://", stray spaces, long encoded Wikimedia links. */
const sourceUrl = z
  .string()
  .trim()
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.string().url("The source link doesn't look like a web address. Copy it from the browser's address bar.").max(2000, "The source link is too long.").or(z.literal("")));

const schema = z.object({
  id: z.string().regex(/^img-[a-z0-9-]+$/),
  path: z.string().regex(/^img-[a-z0-9-]+-\d+\.(webp|jpg)$/),
  license: z.string().trim().min(2, "Choose a licence.").max(80),
  author: z.string().trim().max(300, "Author / credit is too long (300 characters max)."),
  sourceUrl,
});

/** Validation problems come back as a message on the card instead of crashing the request. */
function parse<T extends z.ZodTypeAny>(s: T, input: unknown): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: string } {
  const r = s.safeParse(input);
  return r.success ? { data: r.data } : { error: r.error.issues.map((i) => i.message).join(" ") };
}

export async function markImageReady(input: z.infer<typeof schema>): Promise<{ error?: string }> {
  await requireViewer("mentor");
  const p = parse(schema, input);
  if (p.error !== undefined) return { error: p.error };
  const d = { ...p.data, sourceUrl: p.data.license === "Own photo" ? "" : p.data.sourceUrl };
  if (d.license !== "Own photo" && !d.sourceUrl) return { error: "Open-licence photos need the source link." };
  const spec = loadImageManifest().find((m) => m.id === d.id);
  if (!spec) return { error: "Unknown photo slot." };
  const db = await supabaseServer();
  const { data: old } = await db.from("images").select("path").eq("id", d.id).maybeSingle();
  // Upsert, not update: if content hasn't been synced yet the row may not exist, and an update
  // of zero rows used to report success while saving nothing.
  const { data: saved, error } = await db
    .from("images")
    .upsert({
      id: d.id, description: spec.description, shot_notes: spec.shotNotes, aspect: spec.aspect,
      path: d.path, license: d.license, author: d.author || null, source_url: d.sourceUrl || null, status: "ready",
    })
    .select("id");
  if (error) return { error: error.message };
  if (!saved?.length) return { error: "The photo uploaded but could not be recorded. Please try again." };
  if (old?.path && old.path !== d.path) await db.storage.from("content-images").remove([old.path as string]);
  // No revalidate: the "missing only" list would drop this card before GB sees its confirmation.
  return {};
}

const detailsSchema = schema.omit({ path: true });

/** Change the licence / credit of an uploaded photo without re-uploading it. */
export async function saveImageDetails(input: z.infer<typeof detailsSchema>): Promise<{ error?: string }> {
  await requireViewer("mentor");
  const p = parse(detailsSchema, input);
  if (p.error !== undefined) return { error: p.error };
  const d = p.data;
  if (d.license !== "Own photo" && !d.sourceUrl) return { error: "Open-licence photos need the source link." };
  const db = await supabaseServer();
  const { data: saved, error } = await db
    .from("images")
    .update({ license: d.license, author: d.author || null, source_url: d.sourceUrl || null })
    .eq("id", d.id)
    .select("id");
  if (error) return { error: error.message };
  if (!saved?.length) return { error: "Not saved: this photo has no uploaded file yet." };
  return {};
}

export async function removeImage(id: string) {
  await requireViewer("mentor");
  const db = await supabaseServer();
  const { data } = await db.from("images").select("path").eq("id", z.string().parse(id)).maybeSingle();
  if (data?.path) await db.storage.from("content-images").remove([data.path as string]);
  await db.from("images").update({ path: null, license: null, author: null, status: "needed" }).eq("id", id);
  revalidatePath("/admin/images");
}
