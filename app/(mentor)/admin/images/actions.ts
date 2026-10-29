"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { loadImageManifest } from "@/lib/content/load";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  id: z.string().regex(/^img-[a-z0-9-]+$/),
  path: z.string().regex(/^img-[a-z0-9-]+-\d+\.(webp|jpg)$/),
  license: z.string().trim().min(2).max(80),
  author: z.string().trim().max(120),
  sourceUrl: z.string().trim().url().max(500).or(z.literal("")),
});

export async function markImageReady(input: z.infer<typeof schema>): Promise<{ error?: string }> {
  await requireViewer("mentor");
  const d = schema.parse(input);
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
  const d = detailsSchema.parse(input);
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
