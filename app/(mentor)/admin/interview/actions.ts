"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function commentInterview(id: string, comment: string) {
  await requireViewer("mentor");
  const db = await supabaseServer();
  await db.from("interview_answers").update({ mentor_comment: z.string().trim().max(1500).parse(comment) || null }).eq("id", z.string().uuid().parse(id));
  revalidatePath("/admin/interview");
}
