"use client";
import { cn } from "@/lib/cn";
import type { ClientItem } from "@/lib/items/types";
import { wordCount } from "@/lib/scoring/grade";

export type ItemValue = string | string[] | null;

/** Renders one question with its answer controls. SVG markup comes from our own generators/content. */
export function ItemView({
  item, value, onChange, disabled, mark,
}: {
  item: ClientItem;
  value: ItemValue;
  onChange?: (v: ItemValue) => void;
  disabled?: boolean;
  /** Result view: highlight correct / chosen options. */
  mark?: { correct: string[]; chosen: string[] };
}) {
  const hasSvgOptions = item.options?.some((o) => o.svg);
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const toggle = (id: string) => {
    if (!onChange || disabled) return;
    if (item.type === "mcq") onChange(id);
    else {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange([...next].sort());
    }
  };
  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed md:text-xl">{item.stem}</p>
      {item.type === "multi" && <p className="-mt-3 text-sm font-medium text-accent">Select all that apply.</p>}
      {item.stemSvg && (
        <div className="puzzle-svg mx-auto max-w-md rounded-2xl border border-line bg-surface p-3" dangerouslySetInnerHTML={{ __html: item.stemSvg }} />
      )}
      {item.images.length > 0 && (
        <div className={cn("grid gap-3", item.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {item.images.map((img, i) => (
            <figure key={img.url} className="overflow-hidden rounded-2xl border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="h-auto w-full object-contain" loading="lazy" />
              {item.images.length > 1 && <figcaption className="px-3 py-1 text-xs text-ink-3">Photo {i + 1}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {item.options && (
        <div role={item.type === "mcq" ? "radiogroup" : "group"} aria-label="Answer options" className={cn("grid gap-3", hasSvgOptions ? "grid-cols-2" : "grid-cols-1")}>
          {item.options.map((o) => {
            const isSel = selected.has(o.id);
            const isCorrect = mark?.correct.includes(o.id);
            const isWrongPick = mark && mark.chosen.includes(o.id) && !isCorrect;
            return (
              <button
                key={o.id}
                type="button"
                role={item.type === "mcq" ? "radio" : "checkbox"}
                aria-checked={isSel}
                disabled={disabled}
                onClick={() => toggle(o.id)}
                className={cn(
                  "group flex min-h-14 items-center gap-3 rounded-2xl border-2 bg-surface p-3 text-left transition active:scale-[0.99]",
                  hasSvgOptions && "flex-col items-stretch",
                  !mark && (isSel ? "border-accent bg-accent-soft" : "border-line hover:border-ink-3"),
                  mark && isCorrect && "border-good bg-good-soft",
                  mark && isWrongPick && "border-bad bg-bad-soft",
                  mark && !isCorrect && !isWrongPick && "border-line opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold uppercase",
                    isSel && !mark ? "border-accent bg-accent text-accent-ink" : "border-line text-ink-2",
                    mark && isCorrect && "border-good bg-good text-white",
                    mark && isWrongPick && "border-bad bg-bad text-white",
                  )}
                  aria-hidden
                >
                  {mark && isCorrect ? "✓" : mark && isWrongPick ? "✗" : o.id}
                </span>
                {o.svg ? (
                  <span className="puzzle-svg block w-full" dangerouslySetInnerHTML={{ __html: o.svg }} />
                ) : (
                  <span className="text-base">{o.text}</span>
                )}
                <span className="sr-only">
                  Option {o.id}
                  {mark && isCorrect ? " (correct answer)" : ""}
                  {mark && isWrongPick ? " (your answer)" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {item.type === "short" && (
        <div>
          <label htmlFor={`ans-${item.id}`} className="sr-only">
            Your answer
          </label>
          <textarea
            id={`ans-${item.id}`}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            rows={7}
            placeholder={"Write one idea per line, e.g.\n1. …\n2. …"}
            className="block w-full rounded-2xl border-2 border-line bg-surface p-4 text-base leading-relaxed focus:border-accent focus:outline-none"
          />
          <p className={cn("mt-1 text-right text-xs", item.maxWords && wordCount(String(value ?? "")) > item.maxWords ? "text-bad" : "text-ink-3")}>
            {wordCount(String(value ?? ""))} words{item.maxWords ? ` / ${item.maxWords} max` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
