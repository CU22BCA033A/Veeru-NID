"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { keepFormOnSubmit } from "@/lib/hooks/use-keep-form";
import { saveWhy } from "./actions";

export function WhyForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState(saveWhy, { message: null });
  return (
    <form onSubmit={keepFormOnSubmit(action)} className="space-y-3">
      <label className="block">
        <span className="sr-only">Why I want NID</span>
        <textarea name="why" defaultValue={initial} rows={4} maxLength={600} placeholder="I want to get into NID because…" className="block w-full rounded-xl border border-line bg-surface p-3" />
      </label>
      {state.message && <p role="status" className="text-sm text-good">{state.message}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
