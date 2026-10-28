"use client";
import { useTransition } from "react";
import { CloudRain } from "lucide-react";
import { setToughDay } from "@/app/(student)/actions";

export function ToughDayToggle({ planId, on }: { planId: string; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setToughDay(planId, !on))}
      aria-pressed={on}
      className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-ink-2 hover:bg-surface-2"
    >
      <CloudRain className="size-4" aria-hidden />
      {on ? "Tough-day mode is on: half load today" : "Tough day? Halve today's load"}
    </button>
  );
}
