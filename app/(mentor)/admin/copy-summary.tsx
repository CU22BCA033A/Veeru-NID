"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopySummary({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-sm leading-relaxed">{text}</pre>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); }}>
          <Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy"}
        </Button>
        <a className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm text-ink-2 hover:bg-surface-2" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          Open in WhatsApp
        </a>
      </div>
    </div>
  );
}
