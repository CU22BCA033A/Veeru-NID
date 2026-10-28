import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { itemContentHash } from "@/lib/content/hash";
import { loadAuthoredItems, loadImageManifest, SUBTOPICS } from "@/lib/content/load";
import type { ItemInput } from "@/lib/content/schemas";
import { buildGeneratedPool } from "@/lib/generators";
import { seedBaseContent } from "./base";
import { loadExtraContent, type ExtraContent } from "./extra";

/** Bump when generator output changes in a way that should refresh stored puzzles. */
export const GENERATOR_VERSION = "1";

export interface SyncResult {
  version: string;
  changed: boolean;
  counts: Record<string, number>;
}

function contentVersion(items: ItemInput[], extra: ExtraContent): string {
  return createHash("sha256")
    .update(JSON.stringify([GENERATOR_VERSION, loadImageManifest(), items, extra]))
    .digest("hex")
    .slice(0, 16);
}

async function upsertBatched(db: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict?: string) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 400), onConflict ? { onConflict } : undefined);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export function authoredItemRow(item: ItemInput) {
  return {
    id: item.id,
    type: item.type,
    category_id: SUBTOPICS.get(item.subtopic)!,
    subtopic_id: item.subtopic,
    difficulty: item.difficulty,
    source: item.source,
    pattern_ref: item.patternRef ?? null,
    stem: item.stem,
    stem_svg: item.stemSvg ?? null,
    options: item.options ?? null,
    answer: item.answer ?? null,
    explanation: item.explanation,
    distractor_rationale: item.distractors ?? null,
    takeaway: item.takeaway ?? null,
    model_answer: item.modelAnswer ?? null,
    rubric: item.rubric ?? null,
    tags: item.tags,
    image_ids: item.imageIds,
    valid_until: item.validUntil ?? null,
    needs_review: item.needsReview,
    status: "live",
    content_hash: itemContentHash(item),
    variant_of: item.variantOf ?? null,
  };
}

/**
 * Copy everything in /content (plus generated puzzles) into the database. Idempotent.
 * Never touches student data, uploaded image files, or items the mentor imported (PYQs).
 */
export async function syncContent(db: SupabaseClient, opts: { force?: boolean } = {}): Promise<SyncResult> {
  const items = loadAuthoredItems();
  const extra = loadExtraContent();
  const version = contentVersion(items, extra);
  const { data: settings } = await db.from("settings").select("content_version").eq("id", 1).maybeSingle();
  if (!opts.force && settings?.content_version === version) return { version, changed: false, counts: {} };

  await seedBaseContent(db);

  // Images: insert new specs, refresh text of existing ones, never overwrite an uploaded file.
  const manifest = loadImageManifest();
  const { data: existingImages } = await db.from("images").select("id");
  const have = new Set((existingImages ?? []).map((r) => r.id as string));
  const newImages = manifest.filter((m) => !have.has(m.id));
  if (newImages.length) {
    await upsertBatched(db, "images", newImages.map((m) => ({
      id: m.id, description: m.description, shot_notes: m.shotNotes, aspect: m.aspect, source_url: m.openSource ?? null, status: "needed",
    })));
  }
  for (const m of manifest.filter((x) => have.has(x.id))) {
    await db.from("images").update({ description: m.description, shot_notes: m.shotNotes, aspect: m.aspect }).eq("id", m.id);
  }

  // Keep the mentor's decisions: retired questions stay retired, verified facts stay verified.
  const { data: notLive } = await db.from("items").select("id,status").neq("status", "live").neq("source", "Generated");
  const flagged = items.filter((i) => i.needsReview).map((i) => i.id);
  const { data: verified } = flagged.length ? await db.from("items").select("id").eq("needs_review", false).in("id", flagged) : { data: [] };
  const statusOf = new Map((notLive ?? []).map((d) => [d.id as string, d.status as string]));
  const verifiedIds = new Set((verified ?? []).map((d) => d.id as string));
  await upsertBatched(db, "items", items.map((i) => {
    const row = authoredItemRow(i);
    return { ...row, status: statusOf.get(i.id) ?? row.status, needs_review: row.needs_review && !verifiedIds.has(i.id) };
  }));

  const pool = buildGeneratedPool();
  await upsertBatched(db, "items", pool.map((g) => ({
    id: g.id, type: "mcq", category_id: SUBTOPICS.get(g.subtopic)!, subtopic_id: g.subtopic, difficulty: g.difficulty,
    source: "Generated", stem: g.stem, stem_svg: g.stemSvg ?? null, options: g.options, answer: g.answer,
    explanation: g.explanation, takeaway: g.takeaway, tags: ["generated", g.generator], status: "live",
    content_hash: g.contentHash, generator: g.generator, generator_seed: String(g.seed),
  })));
  await upsertBatched(db, "generators_log", pool.map((g) => ({ generator: g.generator, seed: String(g.seed), content_hash: g.contentHash, item_id: g.id })), "generator,seed");

  await upsertBatched(db, "concept_cards", extra.conceptCards);
  await upsertBatched(db, "tips", extra.tips);
  await upsertBatched(db, "studio_tasks", extra.studioTasks);
  await upsertBatched(db, "mocks", extra.mocks);

  await db.from("settings").update({ content_version: version, content_synced_at: new Date().toISOString() }).eq("id", 1);
  return {
    version,
    changed: true,
    counts: {
      items: items.length, generated: pool.length, images: manifest.length,
      conceptCards: extra.conceptCards.length, tips: extra.tips.length, studioTasks: extra.studioTasks.length, mocks: extra.mocks.length,
    },
  };
}
