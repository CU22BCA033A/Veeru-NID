/** What the browser receives for a question: never the answer. */
export interface ClientItem {
  id: string;
  type: "mcq" | "multi" | "short";
  stem: string;
  stemSvg: string | null;
  images: { url: string; alt: string }[];
  options: { id: string; text?: string; svg?: string }[] | null;
  category: string;
  categoryName: string;
  subtopic: string;
  subtopicName: string;
  source: string;
  difficulty: number;
  maxWords: number | null;
  review?: boolean;
}

export interface AttemptInput {
  itemId: string;
  answer: string | string[] | null;
  confidence: "sure" | "guess" | null;
  timeMs: number;
  clientId: string;
}
