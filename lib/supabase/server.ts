import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, supabaseServiceKey } from "./env";

/** Per-request client acting as the signed-in user (RLS applies). */
export async function supabaseServer() {
  // Read cookies first so every page using this is rendered per request (never prerendered at build).
  const store = await cookies();
  const { url, anonKey } = publicEnv();
  return createServerClient(url, anonKey, {
    global: { fetch: freshFetch },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component — middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Next.js memoises identical GET fetches during a render, so "insert, then read back" in one
 * render would return the stale first read. Database calls must always hit the database.
 */
const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? new AbortController().signal });

/** Service-role client. Server-only; bypasses RLS — use for seeding and trusted jobs only. */
export function supabaseAdmin() {
  const { url } = publicEnv();
  const key = supabaseServiceKey();
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false }, global: { fetch: freshFetch } });
}
