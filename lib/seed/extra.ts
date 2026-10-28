import { createHash } from "node:crypto";
import tipsJson from "@/content/tips.json";
import { conceptsFiles, mocksFiles, studioFiles } from "@/content/index";
import { conceptFileSchema, mockFileSchema, studioFileSchema, tipsFileSchema, type Mock, type StudioTask } from "@/lib/content/schemas";
import { normaliseText } from "@/lib/content/hash";

export function loadStudioTasks(): StudioTask[] {
  return studioFiles.flatMap((f) => studioFileSchema.parse(f).tasks);
}
export function loadMocks(): Mock[] {
  return mocksFiles.flatMap((f) => mockFileSchema.parse(f).mocks);
}
export function loadConceptCards() {
  return conceptsFiles.flatMap((f) => conceptFileSchema.parse(f).cards);
}
export function loadTips() {
  return tipsFileSchema.parse(tipsJson).tips;
}

export function studioTaskRow(t: StudioTask) {
  return {
    id: t.id, kind: t.kind, category: t.category, subtopic_id: t.subtopic ?? null, title: t.title, brief: t.brief,
    minutes: t.minutes, sheet: t.sheet, materials: t.materials, hints: t.hints, examiner_checklist: t.checklist,
    phases: t.phases, difficulty: t.difficulty, source: t.source, status: "live",
    content_hash: createHash("sha256").update(normaliseText(t.title + " " + t.brief)).digest("hex").slice(0, 32),
  };
}

export function loadExtraContent() {
  return {
    conceptCards: loadConceptCards().map((c) => ({ id: c.id, subtopic_id: c.subtopic, title: c.title, body: c.body, svg: c.svg ?? null })),
    tips: loadTips().map((t) => ({ id: t.id, phases: t.phases, category: t.category, title: t.title, body: t.body })),
    studioTasks: loadStudioTasks().map(studioTaskRow),
    mocks: loadMocks().map((m) => ({
      id: m.id, title: m.title, format: m.format, duration_min: m.durationMin, total_marks: m.totalMarks,
      questions: m.questions, analysis: m.analysis, status: "live",
    })),
  };
}
export type ExtraContent = ReturnType<typeof loadExtraContent>;
