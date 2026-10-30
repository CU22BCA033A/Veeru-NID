import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

/** Undo what earlier runs left behind so every spec starts from the same state. Local stack only. */
export default async function globalSetup() {
  config({ path: ".env.local" });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("e2e needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error(`Refusing to reset test data on a non-local Supabase (${url})`);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const check = (label: string, r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
  };
  check("mock attempts", await db.from("mock_attempts").delete().in("mock_id", ["mock-mini-02", "mock-mini-03", "mock-aptitude-01"]));
  // The test PYQ may have been served since (e.g. picked for a mock), so clear its references first.
  const { data: pyq } = await db.from("items").select("id").eq("source", "PYQ").ilike("stem", "%secondary colour on the RYB wheel%");
  const pyqIds = (pyq ?? []).map((r) => r.id as string);
  if (pyqIds.length) {
    for (const t of ["served_items", "attempts", "homework", "srs_cards", "item_reports"]) check(`PYQ refs in ${t}`, await db.from(t).delete().in("item_id", pyqIds));
    check("PYQ items", await db.from("items").delete().in("id", pyqIds));
  }
  check("test photos", await db.from("images").update({ path: null, license: null, author: null, source_url: null, status: "needed" }).eq("status", "ready"));
}
