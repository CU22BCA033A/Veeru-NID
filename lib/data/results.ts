import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultData } from "@/components/item/result-item";
import { getItems, toClientItems } from "./items";

/** Attempts (latest per item) joined with full item data, in a stable order. */
export async function resultRows(db: SupabaseClient, attempts: { id: string; item_id: string; answer: unknown; correct: boolean; score: number; confidence: "sure" | "guess" | null; time_ms: number; note: string | null }[], order: string[]): Promise<ResultData[]> {
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) latest.set(a.item_id, a);
  const ids = order.filter((id) => latest.has(id));
  const items = await getItems(db, ids);
  const clients = await toClientItems(db, items);
  return items.map((it, i) => {
    const a = latest.get(it.id)!;
    return {
      attemptId: a.id, item: clients[i]!, answer: a.answer as ResultData["answer"], correctAnswer: it.answer,
      correct: a.correct, score: Number(a.score), confidence: a.confidence, timeMs: a.time_ms,
      explanation: it.explanation, distractors: it.distractor_rationale, takeaway: it.takeaway, modelAnswer: it.model_answer, note: a.note, index: i + 1,
    };
  });
}
