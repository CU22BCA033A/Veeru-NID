"use client";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runContentSync } from "./actions";

export function SyncButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <Button onClick={() => start(async () => setMsg((await runContentSync()).message))} disabled={pending}>
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden /> {pending ? "Syncing… (up to a minute)" : "Sync content now"}
      </Button>
      {msg && <p role="status" className="mt-2 text-sm text-ink-2">{msg}</p>}
    </div>
  );
}
