export interface GeneratedOption {
  id: string; // a–d
  svg?: string;
  text?: string;
}

export interface GeneratedItem {
  id: string;
  generator: string;
  seed: number;
  subtopic: string;
  difficulty: number;
  stem: string;
  stemSvg?: string;
  options: GeneratedOption[];
  answer: string;
  explanation: string;
  takeaway: string;
}

export interface Generator {
  id: string;
  subtopic: string;
  /** Deterministic: same seed → same puzzle. Returns null if this seed can't make a valid puzzle. */
  generate(seed: number): GeneratedItem | null;
}

export const OPTION_IDS = ["a", "b", "c", "d"] as const;
