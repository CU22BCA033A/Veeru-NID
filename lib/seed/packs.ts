import "server-only";
import { createDecipheriv } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { SupabaseClient } from "@supabase/supabase-js";
import papers from "@/content/packs/papers.json";

/**
 * Question packs from papers the owner supplied (e.g. NID's sample paper). The repo is public, so
 * a pack is stored encrypted (AES-256-GCM); the mentor imports it with the key, which is never committed.
 */
interface Pack {
  items: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  mocks: Record<string, unknown>[];
}

export const PAPER_PACK_NAME: string = papers.name;

export function decryptPack(data: string, key: string): Pack {
  const k = Buffer.from(key.trim(), "base64url");
  if (k.length !== 32) throw new Error("That key isn't the right length. Copy the whole key.");
  const raw = Buffer.from(data, "base64");
  const d = createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  try {
    return JSON.parse(gunzipSync(Buffer.concat([d.update(raw.subarray(28)), d.final()])).toString("utf8")) as Pack;
  } catch {
    throw new Error("Wrong key: the pack could not be opened.");
  }
}

/** Insert or update everything in the pack. Safe to run again; GB's later edits to status are kept. */
export async function importPaperPack(db: SupabaseClient, key: string): Promise<{ items: number; tasks: number; mocks: number }> {
  const pack = decryptPack(papers.data, key);
  const { data: existing } = await db.from("items").select("id,status,needs_review").in("id", pack.items.map((i) => i.id as string));
  const kept = new Map((existing ?? []).map((r) => [r.id as string, r]));
  // Keep GB's decisions on re-import: a draft he made live stays live, a checked fact stays checked.
  const items = pack.items.map((i) => {
    const k = kept.get(i.id as string);
    return k ? { ...i, status: k.status, needs_review: k.needs_review } : i;
  });
  for (let i = 0; i < items.length; i += 50) {
    const { error } = await db.from("items").upsert(items.slice(i, i + 50));
    if (error) throw new Error(`questions: ${error.message}`);
  }
  const { error: te } = await db.from("studio_tasks").upsert(pack.tasks);
  if (te) throw new Error(`drawing tasks: ${te.message}`);
  const { error: me } = await db.from("mocks").upsert(pack.mocks);
  if (me) throw new Error(`mocks: ${me.message}`);
  return { items: items.length, tasks: pack.tasks.length, mocks: pack.mocks.length };
}
