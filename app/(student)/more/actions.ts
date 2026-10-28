"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveWhy(_prev: { message: string | null }, form: FormData): Promise<{ message: string | null }> {
  const viewer = await requireViewer("student");
  const why = z.string().trim().max(600).parse(String(form.get("why") ?? ""));
  const db = await supabaseServer();
  await db.from("profiles").update({ why_nid: why || null }).eq("id", viewer.id);
  revalidatePath("/", "layout");
  return { message: "Saved. You'll see it on tough days." };
}
