"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { keepFormOnSubmit } from "@/lib/hooks/use-keep-form";
import { saveReflection } from "../../../actions";

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];
const ENERGY = ["Drained", "Low", "OK", "Good", "Charged"];

function Scale({ name, label, values, initial }: { name: string; label: string; values: string[]; initial?: number }) {
  const [v, setV] = useState<number | undefined>(initial);
  return (
    <fieldset>
      <legend className="text-sm text-ink-2">{label}</legend>
      <input type="hidden" name={name} value={v ?? ""} />
      <div className="mt-2 grid grid-cols-5 gap-2">
        {values.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-pressed={v === i + 1}
            onClick={() => setV(i + 1)}
            className={cn("min-h-12 rounded-xl border text-sm", v === i + 1 ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface", s.length <= 2 && "text-2xl")}
          >
            {s}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ReflectForm({ dayNo, prompt, initial }: { dayNo: number; prompt: string; initial: { mood?: number; energy?: number; sleep?: number; learned?: string; observation?: string } }) {
  const [state, action, pending] = useActionState(saveReflection, { message: null });
  return (
    <form onSubmit={keepFormOnSubmit(action)} className="space-y-6">
      <input type="hidden" name="dayNo" value={dayNo} />
      <Scale name="mood" label="How do you feel?" values={MOODS} initial={initial.mood} />
      <Scale name="energy" label="Energy" values={ENERGY} initial={initial.energy} />
      <label className="block">
        <span className="text-sm text-ink-2">Hours slept last night</span>
        <input name="sleep" type="number" step="0.5" min="0" max="24" defaultValue={initial.sleep} required className="mt-1 block min-h-11 w-32 rounded-xl border border-line bg-surface px-3 text-base" />
      </label>
      <label className="block">
        <span className="text-sm text-ink-2">One sentence: what I learned today</span>
        <input name="learned" defaultValue={initial.learned} maxLength={500} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base" />
      </label>
      <label className="block">
        <span className="text-sm text-ink-2">Observation journal (optional): {prompt}</span>
        <textarea name="observation" defaultValue={initial.observation} rows={4} maxLength={1000} className="mt-1 block w-full rounded-xl border border-line bg-surface p-3 text-base" />
      </label>
      {state.message && <p role="status" className="text-sm text-good">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save reflection"}</Button>
      <p className="text-xs text-ink-3">Only you and GB can see this.</p>
    </form>
  );
}
