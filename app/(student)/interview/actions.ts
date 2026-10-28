"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  question: z.string().max(400),
  audioPath: z.string().max(200).nullable(),
  transcript: z.string().max(20000),
  durationS: z.number().int().min(0).max(1800),
  selfRating: z.record(z.string(), z.number().int().min(1).max(5)),
  notes: z.string().max(1000),
});

export async function saveInterviewAnswer(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Missing details" };
  const viewer = await requireViewer("student");
  if (p.data.audioPath && !p.data.audioPath.startsWith(`${viewer.id}/interview/`)) return { ok: false, error: "Bad path" };
  const db = await supabaseServer();
  const { error } = await db.from("interview_answers").insert({
    user_id: viewer.id, question: p.data.question, audio_path: p.data.audioPath, transcript: p.data.transcript || null,
    duration_s: p.data.durationS, self_rating: p.data.selfRating, self_notes: p.data.notes || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/interview");
  return { ok: true };
}
