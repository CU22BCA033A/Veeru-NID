import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "student" | "mentor";
export interface Viewer {
  id: string;
  email: string | undefined;
  role: Role;
  displayName: string;
}

/**
 * Signed-in user + profile, fetched once per request: the layout and the page both ask,
 * and on Vercel every extra round trip to Supabase is felt as a slow tap.
 */
const loadViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await supabaseServer();
  // getUser, not getClaims: with legacy (HS256) project keys getClaims was slower under load.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, display_name").eq("id", auth.user.id).single();
  if (!profile) return null;
  return { id: auth.user.id, email: auth.user.email, role: profile.role as Role, displayName: profile.display_name as string };
});

/** The signed-in user with their profile, or a redirect to /login. */
export async function requireViewer(role?: Role): Promise<Viewer> {
  const viewer = await loadViewer();
  if (!viewer) redirect("/login");
  if (role && viewer.role !== role) redirect(viewer.role === "mentor" ? "/admin" : "/");
  return viewer;
}

/** The student account (there is exactly one). Mentor views use this to look at Veeru's data. */
export const studentProfile = cache(async (): Promise<{ id: string; displayName: string } | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("profiles").select("id, display_name").eq("role", "student").limit(1).maybeSingle();
  return data ? { id: data.id as string, displayName: data.display_name as string } : null;
});
