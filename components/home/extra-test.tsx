"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startExtraTest } from "@/app/(student)/actions";

const LAST = "nidprep:last-practice";

function StartButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="flex-1">{pending ? "Preparing questions…" : "Yes, start it"}</Button>;
}

/** "Take another test today?" Asks first, then starts a 30-question mixed test. */
export function ExtraTestButton({ label = "Take another test today", question = "You've finished today's test. Start an extra 30-question mixed test now?" }: { label?: string; question?: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setAsking(true)}>
        <Plus className="size-4" aria-hidden /> {label}
      </Button>
    );
  }
  return (
    <form action={startExtraTest} className="space-y-3 rounded-2xl border border-accent bg-accent-soft p-4" role="group" aria-label="Confirm extra test">
      <p className="font-medium">{question}</p>
      <p className="text-sm text-ink-2">About 30 minutes. Every category, mixed puzzle types. Mistakes go to homework.</p>
      <div className="flex gap-2">
        <StartButton />
        <Button type="button" variant="ghost" onClick={() => setAsking(false)}>Not now</Button>
      </div>
    </form>
  );
}

/** Put on the extra test page so Today can offer "Continue" if he leaves half-way. */
export function RememberPractice({ storageKey, total }: { storageKey: string; total: number }) {
  useEffect(() => {
    try {
      localStorage.setItem(LAST, JSON.stringify({ href: location.pathname + location.search, key: storageKey, total }));
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, [storageKey, total]);
  return null;
}

export function lastPractice(): { href: string; key: string; total: number } | null {
  try {
    const v = localStorage.getItem(LAST);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
