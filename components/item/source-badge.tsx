import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, { label: string; tone: "neutral" | "accent" | "good" | "warn" }> = {
  PYQ: { label: "PYQ", tone: "accent" },
  "PYQ-style": { label: "PYQ-style", tone: "warn" },
  "Expected-2027": { label: "Expected 2027", tone: "good" },
  Practice: { label: "Practice", tone: "neutral" },
  Generated: { label: "Visual puzzle", tone: "neutral" },
};

export function SourceBadge({ source }: { source: string }) {
  const s = LABELS[source] ?? { label: source, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
