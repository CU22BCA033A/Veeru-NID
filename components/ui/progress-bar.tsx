import { cn } from "@/lib/cn";

export function ProgressBar({ value, max, label, className, tone = "accent" }: { value: number; max: number; label: string; className?: string; tone?: "accent" | "good" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone === "good" ? "bg-good" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}
