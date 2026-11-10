"use client";
import { useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importPapers } from "./actions";

/** Paste the key once to load the question papers (stored encrypted because the code is public). */
export function ImportPapers({ name }: { name: string }) {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => { e.preventDefault(); start(async () => setMsg(await importPapers(key))); }}
    >
      <p className="text-sm text-ink-2">{name}. Paste the key you were given, then import. Safe to repeat.</p>
      <label className="block text-sm">
        <span className="sr-only">Pack key</span>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Pack key" autoComplete="off" spellCheck={false} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 font-mono text-sm" />
      </label>
      <Button type="submit" variant="secondary" disabled={pending || key.trim().length < 20}>
        <FileUp className="size-4" aria-hidden /> {pending ? "Importing… (up to a minute)" : "Import question papers"}
      </Button>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.message}</p>}
    </form>
  );
}
