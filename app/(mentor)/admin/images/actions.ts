"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
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
  const db = await supabaseServer();
  const { data: old } = await db.from("images").select("path").eq("id", d.id).maybeSingle();
  const { error } = await db.from("images").update({ path: d.path, license: d.license, author: d.author || null, source_url: d.sourceUrl || null, status: "ready" }).eq("id", d.id);
  if (error) return { error: error.message };
  if (old?.path && old.path !== d.path) await db.storage.from("content-images").remove([old.path as string]);
  // No revalidate: the "missing only" list would drop this card before GB sees its confirmation.
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
