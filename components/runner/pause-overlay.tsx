"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Coffee, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen pause. Hides the question (no peeking while the clock is stopped) and offers
 * resume or leave; answers are already saved on the phone, so leaving loses nothing.
 */
export function PauseOverlay({
  onResume, onExit, exitHref, exitLabel = "Save & leave", note,
}: {
  onResume: () => void;
  /** Runs before leaving, e.g. to save the paused time. */
  onExit?: () => void;
  exitHref: string;
  exitLabel?: string;
  note?: string;
}) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => resumeRef.current?.focus(), []);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pause-title" className="fixed inset-0 z-40 flex items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <Coffee className="mx-auto size-10 text-accent" aria-hidden />
        <div className="space-y-2">
          <h2 id="pause-title" className="font-serif text-3xl">Paused</h2>
          <p className="text-ink-2">The timer has stopped and the question is hidden. Stretch, drink water, then come back.</p>
          {note && <p className="text-sm text-ink-3">{note}</p>}
        </div>
        <Button ref={resumeRef} onClick={onResume} className="w-full">
          <Play className="size-4" aria-hidden /> Resume
        </Button>
        <Link href={exitHref} onClick={onExit} className="block min-h-11 py-3 text-sm text-ink-2 underline">
          {exitLabel}
        </Link>
      </div>
    </div>
  );
}
