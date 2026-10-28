"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loginToEmail } from "@/lib/username";

export async function signIn(_prev: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const login = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  if (!login || !password) return { error: "Enter your username and password." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password });
  if (error) {
    if (error.status === 429) return { error: "Too many sign-in attempts. Wait a few minutes and try again." };
    return { error: "That username and password didn't match. (Passwords are case-sensitive.)" };
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
