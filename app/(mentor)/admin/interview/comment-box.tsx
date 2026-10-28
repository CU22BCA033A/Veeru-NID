"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { commentInterview } from "./actions";

export function CommentBox({ id, initial }: { id: string; initial: string }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="mt-2 flex gap-2">
      <label className="sr-only" htmlFor={`c-${id}`}>Comment</label>
      <input id={`c-${id}`} value={v} onChange={(e) => { setV(e.target.value); setSaved(false); }} placeholder="Feedback for Veeru" className="min-h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-sm" />
      <Button variant="secondary" className="min-h-10" disabled={pending} onClick={() => start(async () => { await commentInterview(id, v); setSaved(true); })}>{saved ? "Saved" : "Save"}</Button>
    </div>
  );
}
