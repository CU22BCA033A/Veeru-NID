"use client";
import { useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runContentSync } from "./admin/settings/actions";

/** Shown on every mentor page when this deploy has content the database hasn't loaded yet. */
export function ContentUpdateBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div role="status" className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
      <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
      <span className="flex-1">{msg ?? "New questions and photo slots are ready. Load them so uploads and practice include them."}</span>
      <Button onClick={() => start(async () => setMsg((await runContentSync()).message))} disabled={pending} className="min-h-10">
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden /> {pending ? "Loading… (up to a minute)" : "Load now"}
      </Button>
    </div>
  );
}
