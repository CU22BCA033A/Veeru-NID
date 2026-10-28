"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveItem } from "../actions";

const field = "mt-1 block w-full rounded-xl border border-line bg-surface p-3";

export function EditForm(props: { id: string; stem: string; explanation: string; takeaway: string; status: "live" | "retired" | "draft"; needsReview: boolean }) {
  const [v, setV] = useState(props);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <label className="block text-sm text-ink-2">Question<textarea value={v.stem} onChange={(e) => setV({ ...v, stem: e.target.value })} rows={3} className={field} /></label>
      <label className="block text-sm text-ink-2">Explanation<textarea value={v.explanation} onChange={(e) => setV({ ...v, explanation: e.target.value })} rows={5} className={field} /></label>
      <label className="block text-sm text-ink-2">Takeaway<input value={v.takeaway} onChange={(e) => setV({ ...v, takeaway: e.target.value })} className={`${field} min-h-11 py-2`} /></label>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">Status
          <select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as typeof v.status })} className="min-h-10 rounded-lg border border-line bg-surface px-2">
            <option value="live">live</option><option value="retired">retired (hide)</option><option value="draft">draft</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.needsReview} onChange={(e) => setV({ ...v, needsReview: e.target.checked })} className="size-5" />Needs fact-check</label>
      </div>
      {msg && <p role="status" className="text-sm text-ink-2">{msg}</p>}
      <Button disabled={pending} onClick={() => start(async () => { const r = await saveItem(v); setMsg(r.error ?? "Saved ✓ (open reports on this question are marked fixed)"); })}>{pending ? "Saving…" : "Save"}</Button>
      <p className="text-xs text-ink-3">Edits apply immediately. Retiring and fact-check decisions survive content syncs; text edits to built-in questions are replaced by the app's version on the next sync, so for a permanent wording fix, retire the question or report it to the developer.</p>
    </div>
  );
}
