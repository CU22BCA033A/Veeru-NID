import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientItem } from "@/lib/items/types";
import { supabaseUrl } from "@/lib/supabase/env";

export interface FullItem {
  id: string;
  type: "mcq" | "multi" | "short";
  category_id: string;
  subtopic_id: string;
  difficulty: number;
  source: string;
  stem: string;
  stem_svg: string | null;
  options: { id: string; text?: string; svg?: string }[] | null;
  answer: string | string[] | null;
  explanation: string;
  distractor_rationale: Record<string, string> | null;
  takeaway: string | null;
  model_answer: string | null;
  rubric: { keywords?: string[]; minIdeas?: number; maxWords?: number } | null;
  image_ids: string[];
  generator: string | null;
  variant_of: string | null;
}

export const ITEM_COLS =
  "id,type,category_id,subtopic_id,difficulty,source,stem,stem_svg,options,answer,explanation,distractor_rationale,takeaway,model_answer,rubric,image_ids,generator,variant_of";

export function publicImageUrl(path: string): string {
  return `${supabaseUrl()}/storage/v1/object/public/content-images/${path}`;
}

/** Fetch items by id, keeping the requested order. */
export async function getItems(db: SupabaseClient, ids: string[]): Promise<FullItem[]> {
  if (!ids.length) return [];
  const rows: FullItem[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from("items").select(ITEM_COLS).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as FullItem[]));
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as FullItem[];
}

export async function labels(db: SupabaseClient) {
  const [{ data: cats }, { data: subs }] = await Promise.all([
    db.from("categories").select("id,name"),
    db.from("subtopics").select("id,name,category_id"),
  ]);
  return {
    category: new Map((cats ?? []).map((c) => [c.id as string, c.name as string])),
    subtopic: new Map((subs ?? []).map((s) => [s.id as string, s.name as string])),
  };
}

export async function imageMap(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, { url: string; alt: string }>();
  const { data } = await db.from("images").select("id,path,description,status").in("id", [...new Set(ids)]);
  return new Map(
    (data ?? []).filter((r) => r.status === "ready" && r.path).map((r) => [r.id as string, { url: publicImageUrl(r.path as string), alt: r.description as string }]),
  );
}

/** Strip answers and attach labels/images for the browser. */
export async function toClientItems(db: SupabaseClient, items: FullItem[], reviewIds: Set<string> = new Set()): Promise<ClientItem[]> {
  const [l, imgs] = await Promise.all([labels(db), imageMap(db, items.flatMap((i) => i.image_ids))]);
  return items.map((i) => ({
    id: i.id,
    type: i.type,
    stem: i.stem,
    stemSvg: i.stem_svg,
    images: i.image_ids.map((id) => imgs.get(id)).filter(Boolean) as { url: string; alt: string }[],
    options: i.options,
    category: i.category_id,
    categoryName: l.category.get(i.category_id) ?? i.category_id,
    subtopicName: l.subtopic.get(i.subtopic_id) ?? i.subtopic_id,
    source: i.source,
    difficulty: i.difficulty,
    maxWords: i.rubric?.maxWords ?? null,
    review: reviewIds.has(i.id),
  }));
}
