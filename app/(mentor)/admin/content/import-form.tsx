"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { keepFormOnSubmit } from "@/lib/hooks/use-keep-form";
import { importPyqs } from "./actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importPyqs, { message: null });
  return (
    <form onSubmit={keepFormOnSubmit(action)} className="space-y-3">
      <label className="block text-sm text-ink-2">
        Paste CSV (header: <code>stem,a,b,c,d,answer,explanation,subtopic,difficulty,year</code>) or a JSON array
        <textarea name="data" rows={8} className="mt-1 block w-full rounded-xl border border-line bg-surface p-3 font-mono text-xs" placeholder={'stem,a,b,c,d,answer,explanation,subtopic,difficulty,year\n"Which of these is a warm colour?",Blue,Red,Green,Teal,b,"Red is a warm colour.",colour.temperature,1,2019'} />
      </label>
      {state.message && <p role="status" className="text-sm text-ink-2">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Importing…" : "Import as PYQ"}</Button>
      <p className="text-xs text-ink-3">Only enter real previous-year questions from books or papers you own. They get the PYQ badge; everything else in the app never does.</p>
    </form>
  );
}
