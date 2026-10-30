import { z } from "zod";

export const SOURCES = ["PYQ", "PYQ-style", "Expected-2027", "Practice", "Generated"] as const;

const optionSchema = z.object({
  id: z.string().regex(/^[a-f]$/),
  text: z.string().min(1).optional(),
  svg: z.string().optional(),
});

/** One question as authored in content/items/*.json. */
export const itemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(["mcq", "multi", "short"]),
    subtopic: z.string(),
    difficulty: z.number().int().min(1).max(5),
    source: z.enum(SOURCES),
    patternRef: z.string().optional(),
    stem: z.string().min(8),
    stemSvg: z.string().optional(),
    imageIds: z.array(z.string()).default([]),
    options: z.array(optionSchema).optional(),
    answer: z.union([z.string(), z.array(z.string())]).optional(),
    explanation: z.string().min(10),
    distractors: z.record(z.string(), z.string()).optional(),
    takeaway: z.string().optional(),
    modelAnswer: z.string().optional(),
    rubric: z.object({ keywords: z.array(z.string()), minIdeas: z.number().int().optional(), maxWords: z.number().int().optional() }).optional(),
    tags: z.array(z.string()).default([]),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    needsReview: z.boolean().default(false),
    variantOf: z.string().optional(),
  })
  .superRefine((item, ctx) => {
    if (item.source === "PYQ") {
      ctx.addIssue({ code: "custom", message: "Authored content may never be labelled PYQ — PYQs come only from the admin import." });
    }
    if (item.type === "short") return;
    const ids = (item.options ?? []).map((o) => o.id);
    if (ids.length < 2) ctx.addIssue({ code: "custom", message: `${item.id}: needs at least 2 options` });
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: `${item.id}: duplicate option ids` });
    const answers = item.type === "mcq" ? [item.answer] : item.answer;
    if (item.type === "mcq" && typeof item.answer !== "string") ctx.addIssue({ code: "custom", message: `${item.id}: mcq answer must be one option id` });
    if (item.type === "multi" && !Array.isArray(item.answer)) ctx.addIssue({ code: "custom", message: `${item.id}: multi answer must be an array` });
    for (const a of (answers ?? []) as string[]) {
      if (!ids.includes(a)) ctx.addIssue({ code: "custom", message: `${item.id}: answer "${a}" is not an option` });
    }
    for (const key of Object.keys(item.distractors ?? {})) {
      if (!ids.includes(key) || (answers as string[]).includes(key)) {
        ctx.addIssue({ code: "custom", message: `${item.id}: distractor rationale "${key}" must be a wrong option` });
      }
    }
  });

export const itemFileSchema = z.object({ items: z.array(itemSchema) });

/** A photo the questions need. The mentor shoots/uploads it, or it comes from an open-licence source. */
export const imageSpecSchema = z.object({
  id: z.string().regex(/^img-[a-z0-9-]+$/),
  group: z.string(),
  description: z.string().min(10),
  shotNotes: z.string().min(10),
  aspect: z.enum(["1:1", "4:3", "3:4", "16:9"]),
  /** Optional: where an open-licence version can be found instead of shooting it. */
  openSource: z.string().optional(),
});

export const imageManifestSchema = z.object({ images: z.array(imageSpecSchema) });

export type ItemInput = z.infer<typeof itemSchema>;
export type ImageSpec = z.infer<typeof imageSpecSchema>;

export const conceptCardSchema = z.object({
  id: z.string().regex(/^cc-[a-z0-9.-]+$/),
  subtopic: z.string(),
  title: z.string().min(3),
  body: z.string().min(40).max(1100),
  svg: z.string().optional(),
});
export const conceptFileSchema = z.object({ cards: z.array(conceptCardSchema) });

export const tipSchema = z.object({
  id: z.string().regex(/^tip-[a-z0-9-]+$/),
  phases: z.array(z.enum(["P1", "P2", "P3", "EXAM", "P4", "P5"])).min(1),
  category: z.enum(["drawing", "strategy", "time", "observation", "ideation", "presentation", "wellbeing", "interview"]),
  title: z.string().min(3),
  body: z.string().min(20),
});
export const tipsFileSchema = z.object({ tips: z.array(tipSchema) });

export const studioTaskSchema = z.object({
  id: z.string().regex(/^st-[a-z0-9-]+$/),
  kind: z.enum(["test", "daily", "mains"]),
  category: z.string(),
  subtopic: z.string().optional(),
  title: z.string().min(3),
  brief: z.string().min(20),
  minutes: z.number().int().min(3).max(180),
  sheet: z.string().default("A4"),
  materials: z.array(z.string()).default(["pencil"]),
  hints: z.array(z.string()).default([]),
  checklist: z.array(z.string()).min(2),
  phases: z.array(z.enum(["P1", "P2", "P3", "P4", "P5"])).min(1),
  difficulty: z.number().int().min(1).max(5).default(3),
  source: z.enum(["PYQ-style", "Expected-2027", "Practice"]).default("Practice"),
});
export const studioFileSchema = z.object({ tasks: z.array(studioTaskSchema) });

const mockPartSchema = z.object({ label: z.string(), prompt: z.string().min(5), marks: z.number().min(0) });
export const mockSchema = z.object({
  id: z.string().regex(/^mock-[a-z0-9-]+$/),
  title: z.string(),
  format: z.enum(["2026", "mixed", "mini", "aptitude"]),
  durationMin: z.number().int().positive(),
  totalMarks: z.number().int().positive(),
  questions: z.array(
    z.object({
      no: z.number().int().positive(),
      title: z.string(),
      prompt: z.string().min(10),
      marks: z.number().positive(),
      suggestedMinutes: z.number().int().positive(),
      parts: z.array(mockPartSchema).default([]),
      kind: z.enum(["drawing", "objective"]).default("drawing"),
      itemIds: z.array(z.string()).default([]),
      /** Objective sections: how many questions to draw from the bank. */
      count: z.number().int().min(5).max(80).optional(),
    }),
  ).min(1),
  analysis: z.array(z.object({ no: z.number().int(), idealApproach: z.string().min(20) })),
}).superRefine((m, ctx) => {
  const sum = m.questions.reduce((s, q) => s + q.marks, 0);
  if (Math.abs(sum - m.totalMarks) > 0.01) ctx.addIssue({ code: "custom", message: `${m.id}: marks add to ${sum}, not ${m.totalMarks}` });
  const mins = m.questions.reduce((s, q) => s + q.suggestedMinutes, 0);
  if (mins > m.durationMin) ctx.addIssue({ code: "custom", message: `${m.id}: suggested minutes ${mins} exceed ${m.durationMin}` });
  for (const q of m.questions) {
    if (!m.analysis.some((a) => a.no === q.no)) ctx.addIssue({ code: "custom", message: `${m.id}: no analysis for Q${q.no}` });
  }
});
export const mockFileSchema = z.object({ mocks: z.array(mockSchema) });

export type ConceptCard = z.infer<typeof conceptCardSchema>;
export type Tip = z.infer<typeof tipSchema>;
export type StudioTask = z.infer<typeof studioTaskSchema>;
export type Mock = z.infer<typeof mockSchema>;
