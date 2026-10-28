"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clock, Lightbulb, Play, Plus, Trash2, Square, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { extFor } from "@/lib/image/compress";
import { draft } from "@/lib/offline/queue";
import { RUBRIC, type CriterionId } from "@/lib/studio/rubric";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createSubmission } from "@/app/(student)/studio/actions";
import { CropEditor } from "./crop-editor";

export interface StudioTaskView {
  id: string;
  title: string;
  brief: string;
  minutes: number;
  sheet: string;
  materials: string[];
  hints: string[];
  checklist: string[];
  category: string;
  source: string;
}

type Phase = "brief" | "running" | "upload" | "assess";
interface Saved { phase: Phase; startedAt: number | null; stoppedAt: number | null; hintsShown: number }

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {
    /* audio not available */
  }
}

const mmss = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, "0")}`;

export function StudioSession({ task, viewerId, planId, ctx }: { task: StudioTaskView; viewerId: string; planId: string | null; ctx: "test" | "daily" | "mains" }) {
  const key = `studio:${task.id}:${planId ?? "free"}`;
  const router = useRouter();
  const [s, setS] = useState<Saved>({ phase: "brief", startedAt: null, stoppedAt: null, hintsShown: 0 });
  const [now, setNow] = useState(Date.now());
  const [alert, setAlert] = useState<string | null>(null);
  const [pages, setPages] = useState<Blob[]>([]);
  const [cropping, setCropping] = useState<File | null>(null);
  const [scores, setScores] = useState<Partial<Record<CriterionId, number>>>({});
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fired = useRef(new Set<number>());
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = task.minutes * 60;

  useEffect(() => {
    setS(draft.load<Saved>(key, { phase: "brief", startedAt: null, stoppedAt: null, hintsShown: 0 }));
  }, [key]);
  const save = (next: Saved) => {
    setS(next);
    draft.save(key, next);
  };

  useEffect(() => {
    if (s.phase !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [s.phase]);

  const elapsed = s.startedAt ? Math.round(((s.stoppedAt ?? now) - s.startedAt) / 1000) : 0;
  const left = limit - elapsed;

  useEffect(() => {
    if (s.phase !== "running") return;
    for (const pct of [50, 80, 100]) {
      if (elapsed >= (limit * pct) / 100 && !fired.current.has(pct)) {
        fired.current.add(pct);
        if (elapsed - (limit * pct) / 100 > 5) continue; // don't replay old alerts after reload
        setAlert(pct === 100 ? "Time's up. Finish labels and stop." : pct === 80 ? "80% of the time used. Start finishing: labels, captions." : "Halfway. Is the main idea on the page?");
        navigator.vibrate?.(pct === 100 ? [200, 100, 200] : 150);
        beep();
      }
    }
  }, [elapsed, limit, s.phase]);

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        const id = crypto.randomUUID();
        const sb = supabaseBrowser();
        const paths: string[] = [];
        for (let i = 0; i < pages.length; i++) {
          const blob = pages[i]!;
          const path = `${viewerId}/${id}/${i + 1}.${extFor(blob)}`;
          const { error: upErr } = await sb.storage.from("sheets").upload(path, blob, { contentType: blob.type });
          if (upErr) throw upErr;
          paths.push(path);
        }
        const res = await createSubmission({
          id, taskId: task.id, planId, ctx, imagePaths: paths, timeLimitS: limit, timeUsedS: elapsed, hintsUsed: s.hintsShown, selfScores: scores, checklist: ticks,
        });
        if (!res.ok) throw new Error(res.error);
        draft.clear(key);
        router.push(`/studio/submission/${id}`);
        router.refresh();
      } catch (e) {
        setError(`Upload failed: ${e instanceof Error ? e.message : String(e)}. Check your connection and try again; your photos are still here.`);
      }
    });

  const header = (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <Badge>{task.category}</Badge>
      <Badge tone="neutral"><Clock className="mr-1 size-3" aria-hidden />{task.minutes} min</Badge>
      <Badge tone="neutral">{task.sheet} sheet</Badge>
      {task.materials.map((m) => <Badge key={m} tone="neutral">{m}</Badge>)}
    </div>
  );

  if (s.phase === "brief") {
    return (
      <div className="space-y-5">
        {header}
        <Card className="bg-surface">
          <CardLabel>The brief</CardLabel>
          <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">{task.brief}</p>
        </Card>
        <Card className="bg-surface-2 text-sm text-ink-2">
          Get your {task.sheet} sheet and {task.materials.join(", ")} ready. Read the brief twice, underline the user, the context and what you must deliver. The timer starts when you tap Start.
        </Card>
        <Button className="w-full" onClick={() => save({ ...s, phase: "running", startedAt: Date.now() })}>
          <Play className="size-4" aria-hidden /> Start {task.minutes}-minute timer
        </Button>
        <button type="button" className="w-full text-center text-sm text-ink-3 underline" onClick={() => save({ ...s, phase: "upload", startedAt: Date.now(), stoppedAt: Date.now() + limit * 1000 })}>
          I already drew it (skip the timer)
        </button>
      </div>
    );
  }

  if (s.phase === "running") {
    const pct = Math.min(1, elapsed / limit);
    return (
      <div className="space-y-5">
        {header}
        <div className={cn("rounded-3xl border-2 p-6 text-center", left < 0 ? "border-bad bg-bad-soft" : pct >= 0.8 ? "border-warn bg-warn-soft" : "border-line bg-surface")}>
          <p className="text-sm text-ink-2">{left >= 0 ? "Time left" : "Over time"}</p>
          <p className={cn("font-serif text-7xl tabular-nums", left < 0 && "text-bad")} aria-live="off">{left < 0 ? "+" : ""}{mmss(left)}</p>
          <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full", left < 0 ? "bg-bad" : pct >= 0.8 ? "bg-warn" : "bg-accent")} style={{ width: `${pct * 100}%` }} />
          </div>
        </div>
        {alert && <p role="alert" className="rounded-xl bg-ink p-3 text-center text-sm text-paper">{alert}</p>}
        <details className="rounded-2xl border border-line bg-surface p-4">
          <summary className="cursor-pointer font-medium">Show the brief again</summary>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{task.brief}</p>
        </details>
        {task.hints.length > 0 && (
          <Card>
            <CardLabel className="flex items-center gap-1"><Lightbulb className="size-3.5" aria-hidden />Approach hints ({s.hintsShown}/{task.hints.length} used)</CardLabel>
            <ul className="mt-2 space-y-2 text-sm">
              {task.hints.slice(0, s.hintsShown).map((h) => <li key={h} className="rounded-lg bg-accent-soft p-2">{h}</li>)}
            </ul>
            {s.hintsShown < task.hints.length && (
              <Button variant="secondary" className="mt-3" onClick={() => save({ ...s, hintsShown: s.hintsShown + 1 })}>
                Reveal a hint (costs a hint point)
              </Button>
            )}
          </Card>
        )}
        <Button className="w-full" onClick={() => save({ ...s, phase: "upload", stoppedAt: Date.now() })}>
          <Square className="size-4" aria-hidden /> I&apos;m done: photograph my sheet
        </Button>
      </div>
    );
  }

  if (cropping) {
    return <CropEditor file={cropping} onCancel={() => setCropping(null)} onDone={(blob) => { setPages((p) => [...p, blob]); setCropping(null); }} />;
  }

  if (s.phase === "upload") {
    return (
      <div className="space-y-5">
        {header}
        <Card>
          <CardLabel>Your sheets ({pages.length})</CardLabel>
          <p className="mt-1 text-sm text-ink-2">Lay the sheet flat in good light (no flash), fill the frame, and take the photo from straight above.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {pages.map((p, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(p)} alt={`Page ${i + 1}`} className="aspect-[1/1.414] w-full object-cover" />
                <button type="button" onClick={() => setPages((ps) => ps.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-paper/90 p-1.5" aria-label={`Remove page ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-paper/90 px-1.5 text-xs">{i + 1}</span>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[1/1.414] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-sm text-ink-2 hover:border-accent">
              {pages.length ? <Plus className="size-6" aria-hidden /> : <Camera className="size-6" aria-hidden />}
              {pages.length ? "Add page" : "Take photo"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropping(f); e.target.value = ""; }} />
        </Card>
        <p className="text-center text-sm text-ink-3">Time used: {mmss(elapsed)} of {task.minutes}:00</p>
        <Button className="w-full" disabled={!pages.length} onClick={() => save({ ...s, phase: "assess" })}>
          Rate yourself <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    );
  }

  // assess
  const criteria = RUBRIC.filter((c) => c.id !== "time");
  const done = criteria.every((c) => typeof scores[c.id] === "number");
  return (
    <div className="space-y-5">
      <Card>
        <CardLabel>Rate your own work first</CardLabel>
        <p className="mt-1 text-sm text-ink-2">Be an honest examiner. Your self-score is compared with GB&apos;s score to train your eye.</p>
        <div className="mt-4 space-y-5">
          {criteria.map((c) => (
            <fieldset key={c.id}>
              <legend className="flex w-full justify-between text-sm font-medium">
                <span>{c.label}</span>
                <span className="tabular-nums text-ink-2">{scores[c.id] ?? "–"}/{c.max}</span>
              </legend>
              <p className="text-xs text-ink-3">{c.help}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: c.max + 1 }, (_, v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={scores[c.id] === v}
                    onClick={() => setScores((x) => ({ ...x, [c.id]: v }))}
                    className={cn("size-9 rounded-lg border text-sm tabular-nums", scores[c.id] === v ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Card>
      {task.checklist.length > 0 && (
        <Card>
          <CardLabel>Examiner checklist</CardLabel>
          <ul className="mt-2">
            {task.checklist.map((c) => (
              <li key={c}>
                <label className="flex min-h-11 items-start gap-3 py-2 text-sm">
                  <input type="checkbox" checked={Boolean(ticks[c])} onChange={(e) => setTicks((t) => ({ ...t, [c]: e.target.checked }))} className="mt-0.5 size-5 accent-[var(--accent)]" />
                  {c}
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{error}</p>}
      <Button className="w-full" disabled={!done || pending} onClick={submit}>
        {pending ? "Uploading…" : "Submit for feedback"}
      </Button>
      <button type="button" className="w-full text-center text-sm text-ink-3 underline" onClick={() => save({ ...s, phase: "upload" })}>
        Back to photos
      </button>
    </div>
  );
}
