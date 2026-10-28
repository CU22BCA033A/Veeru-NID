import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Signed (1-hour) URLs for private sheet photos; RLS lets the owner and mentor read them. */
export async function signedSheetUrls(db: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await db.storage.from("sheets").createSignedUrls(paths, 3600);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}
