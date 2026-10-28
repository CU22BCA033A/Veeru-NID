import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Optional AI critique of studio sheets. OFF by default (AI_PROVIDER=none) so the app costs
 * nothing; feedback then comes from self-assessment + mentor. Providers: gemini / groq (free
 * tiers) or anthropic (paid). Server-only: keys never reach the browser.
 */
export type Provider = "none" | "gemini" | "groq" | "anthropic";

export function aiProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  return p === "gemini" || p === "groq" || p === "anthropic" ? p : "none";
}

export function aiEnabled(): boolean {
  return aiProvider() !== "none" && Boolean(process.env.AI_API_KEY);
}

export const critiqueSchema = z.object({
  scores: z.object({
    idea: z.number().min(0).max(10),
    brief: z.number().min(0).max(10),
    communication: z.number().min(0).max(10),
    drawing: z.number().min(0).max(10),
    composition: z.number().min(0).max(10),
    labels: z.number().min(0).max(5),
  }),
  strengths: z.array(z.string()).min(1).max(3),
  improvements: z.array(z.string()).min(1).max(3),
  drill: z.string(),
  estimatedMark: z.number().min(0).max(100),
  summary: z.string(),
});
export type Critique = z.infer<typeof critiqueSchema>;

export function critiquePrompt(task: { title: string; brief: string; minutes: number; checklist: string[] }, timeUsedMin: number): string {
  return [
    "You are an experienced NID DAT (B.Des) examiner reviewing a 17-year-old student's answer sheet(s), photographed from paper.",
    "Judge it like the real exam: understanding of the brief, originality, communication clarity (would an examiner get it in 10 seconds?), drawing skill (proportion, perspective, line quality, light & shade), composition and use of space, and labels/captions/word limits.",
    "Be honest and specific: point at exact parts of the drawing. Never give generic praise. The student is preparing for an exam about 50 days away, so be encouraging but truthful.",
    `TASK: ${task.title}`,
    `BRIEF: ${task.brief}`,
    `TIME LIMIT: ${task.minutes} min. TIME USED: ${timeUsedMin.toFixed(0)} min.`,
    task.checklist.length ? `EXAMINER CHECKLIST: ${task.checklist.join(" | ")}` : "",
    'Reply with ONLY a JSON object, no other text, in exactly this shape: {"scores":{"idea":0-10,"brief":0-10,"communication":0-10,"drawing":0-10,"composition":0-10,"labels":0-5},"strengths":["3 specific strengths"],"improvements":["3 specific improvements"],"drill":"one concrete practice drill for next time","estimatedMark":0-100,"summary":"2 sentences"}',
  ].filter(Boolean).join("\n");
}

export interface SheetImage {
  mediaType: "image/webp" | "image/jpeg" | "image/png";
  base64: string;
}

function parseJson(text: string): Critique | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = critiqueSchema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function viaAnthropic(prompt: string, images: SheetImage[], model: string) {
  const client = new Anthropic({ apiKey: process.env.AI_API_KEY });
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 } })),
          { type: "text" as const, text: prompt },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return { text: "", inTokens: response.usage.input_tokens, outTokens: response.usage.output_tokens };
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { text, inTokens: response.usage.input_tokens, outTokens: response.usage.output_tokens };
}

async function viaGemini(prompt: string, images: SheetImage[], model: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.AI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [...images.map((i) => ({ inline_data: { mime_type: i.mediaType, data: i.base64 } })), { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { text, inTokens: json.usageMetadata?.promptTokenCount ?? 0, outTokens: json.usageMetadata?.candidatesTokenCount ?? 0 };
}

async function viaGroq(prompt: string, images: SheetImage[], model: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...images.slice(0, 5).map((i) => ({ type: "image_url", image_url: { url: `data:${i.mediaType};base64,${i.base64}` } }))] }],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return { text: json.choices?.[0]?.message?.content ?? "", inTokens: json.usage?.prompt_tokens ?? 0, outTokens: json.usage?.completion_tokens ?? 0 };
}

const DEFAULT_MODELS: Record<Exclude<Provider, "none">, string> = {
  gemini: "gemini-2.5-flash",
  groq: "meta-llama/llama-4-scout-17b-16e-instruct",
  anthropic: "claude-opus-5-5",
};

/** Returns a validated critique, or null if AI is off / failed / output unusable. */
export async function critiqueSheets(prompt: string, images: SheetImage[]): Promise<{ critique: Critique | null; provider: Provider; model: string; inTokens: number; outTokens: number }> {
  const provider = aiProvider();
  if (provider === "none" || !process.env.AI_API_KEY || !images.length) return { critique: null, provider, model: "", inTokens: 0, outTokens: 0 };
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];
  const run = provider === "anthropic" ? viaAnthropic : provider === "gemini" ? viaGemini : viaGroq;
  const r = await run(prompt, images, model);
  return { critique: parseJson(r.text), provider, model, inTokens: r.inTokens, outTokens: r.outTokens };
}
