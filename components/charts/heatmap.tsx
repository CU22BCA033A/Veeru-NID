import { cn } from "@/lib/cn";

type Status = "completed" | "partial" | "missed" | "free" | "future" | "today";
const STYLE: Record<Status, string> = {
  completed: "bg-[var(--seq-3)]",
  partial: "bg-[var(--seq-1)]",
  missed: "bg-surface-2",
  free: "bg-surface-2 bg-[repeating-linear-gradient(45deg,transparent_0_3px,var(--line)_3px_4px)]",
  future: "border border-line bg-transparent",
  today: "ring-2 ring-accent bg-[var(--seq-1)]",
};
const LABEL: Record<Status, string> = { completed: "Completed", partial: "Started", missed: "Missed", free: "Rest / exam day", future: "Upcoming", today: "Today" };

/** 100-day plan as a contribution-style grid (10 per row). Status is shown by fill AND pattern/ring, plus a legend. */
export function Heatmap({ days }: { days: { day: number; date: string; status: Status }[] }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1.5" role="list" aria-label="100-day calendar">
        {days.map((d) => (
          <div
            key={d.day}
            role="listitem"
            title={`Day ${d.day} · ${d.date} · ${LABEL[d.status]}`}
            aria-label={`Day ${d.day}, ${LABEL[d.status]}`}
            className={cn("aspect-square rounded-[4px]", STYLE[d.status])}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-ink-2">
        {(["completed", "partial", "missed", "free", "future"] as Status[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-3 rounded-[3px]", STYLE[s])} aria-hidden />
            {LABEL[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
