"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { phasesConfigSchema } from "@/lib/config/schemas";
import { supabaseServer } from "@/lib/supabase/server";

const formSchema = z.object({
  mentorMessage: z.string().max(400),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetReadiness: z.coerce.number().int().min(0).max(100),
});

export async function saveSettings(_prev: { message: string | null }, form: FormData): Promise<{ message: string | null }> {
  await requireViewer("mentor");
  const parsed = formSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Check the values and try again." };
  const current = await loadSettings();
  const phases = phasesConfigSchema.parse({
    ...current.phases,
    startDate: parsed.data.startDate,
    targetReadiness: parsed.data.targetReadiness,
  });
  const supabase = await supabaseServer();
  const { error } = await supabase.from("settings").upsert({
    id: 1,
    phases,
    mentor_message: parsed.data.mentorMessage.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { message: `Couldn't save: ${error.message}` };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function runContentSync(): Promise<{ message: string }> {
  await requireViewer("mentor");
  const { syncContent } = await import("@/lib/seed/sync");
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  try {
    const r = await syncContent(supabaseAdmin(), { force: true });
    revalidatePath("/", "layout");
    return { message: `Synced: ${Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(", ")}.` };
  } catch (e) {
    return { message: `Sync failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

const accountSchema = z.object({
  role: z.enum(["student", "mentor"]),
  username: z.string().trim().regex(/^[A-Za-z0-9._-]{3,30}$/, "Usernames: 3–30 letters, numbers, dot, dash or underscore"),
  password: z.string().min(8, "At least 8 characters").or(z.literal("")),
  displayName: z.string().trim().min(1).max(40),
});

/** Change the username / password / display name of the student or mentor account. */
export async function saveAccount(_prev: { message: string | null }, form: FormData): Promise<{ message: string | null }> {
  const viewer = await requireViewer("mentor");
  const parsed = accountSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the values." };
  const d = parsed.data;
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  const { loginToEmail } = await import("@/lib/username");
  const admin = supabaseAdmin();
  const { data: profile } = d.role === "mentor"
    ? { data: { id: viewer.id } }
    : await admin.from("profiles").select("id").eq("role", "student").limit(1).maybeSingle();
  if (!profile) return { message: "No student account yet." };
  const update: { email: string; password?: string; email_confirm: boolean } = { email: loginToEmail(d.username), email_confirm: true };
  if (d.password) update.password = d.password;
  const { error } = await admin.auth.admin.updateUserById(profile.id as string, update);
  if (error) return { message: `Couldn't save: ${error.message}` };
  await admin.from("profiles").update({ display_name: d.displayName }).eq("id", profile.id);
  revalidatePath("/admin/settings");
  return { message: `Saved. ${d.role === "student" ? "Veeru" : "You"} can now sign in as “${d.username}”${d.password ? " with the new password" : ""}.` };
}
