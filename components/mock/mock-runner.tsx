"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Clock, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardLabel } from "@/components/ui/card";
import { ItemView } from "@/components/item/item-view";
import { CropEditor } from "@/components/studio/crop-editor";
import { cn } from "@/lib/cn";
import { extFor } from "@/lib/image/compress";
import type { Mock } from "@/lib/content/schemas";
import type { ClientItem } from "@/lib/items/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { saveMockProgress, submitMock } from "@/app/(student)/mocks/actions";
import { PauseOverlay } from "@/components/runner/pause-overlay";

type Question = Mock["questions"][number];
const hms = (s: number) => {
  const a = Math.max(0, Math.abs(s));
  return `${Math.floor(a / 3600)}:${String(Math.floor((a % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(a % 60)).padStart(2, "0")}`;
};

export function MockRunner(props: {
  attemptId: string;
  viewerId: string;
  startedAt: string;
  durationMin: number;
  mode: "screen" | "paper";
  questions: Question[];
  objectiveItems: ClientItem[];
  initial: { uploads: Record<string, string[]>; objective: Record<string, string | string[] | null>; timeSplit: Record<string, number>; thumbs: Record<string, string>; pausedMs: number };
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<number>(props.questions[0]!.no);
  const [uploads, setUploads] = useState(props.initial.uploads);
  const [thumbs, setThumbs] = useState<Record<string, string>>(props.initial.thumbs);
  const [objective, setObjective] = useState(props.initial.objective);
  const [timeSplit, setTimeSplit] = useState(props.initial.timeSplit);
  const [now, setNow] = useState(Date.now());
  const [cropping, setCropping] = useState<File | null>(null);
  const [marking, setMarking] = useState(false);
  const [selfMarks, setSelfMarks] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lastTick = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pausedMs, setPausedMs] = useState(props.initial.pausedMs);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  // Paused time (saved + the current pause) pushes the end time back.
  const endsAt = new Date(props.startedAt).getTime() + props.durationMin * 60_000 + pausedMs + (pausedAt ? now - pausedAt : 0);
  const left = Math.round((endsAt - now) / 1000);

  // Tick: clock + time spent on the open question.
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      const dt = (n - lastTick.current) / 1000;
      lastTick.current = n;
      setNow(n);
      if (!marking && !pausedAtRef.current && dt < 10) setTimeSplit((ts) => ({ ...ts, [current]: (ts[current] ?? 0) + dt }));
    }, 1000);
    return () => clearInterval(t);
  }, [current, marking]);

  const persist = useCallback(
    (u = uploads, o = objective, ts = timeSplit, pm = pausedMs) => saveMockProgress({ attemptId: props.attemptId, uploads: u, objective: o, timeSplit: ts, pausedMs: Math.round(pm) }),
    [uploads, objective, timeSplit, pausedMs, props.attemptId],
  );
  // Autosave every 30s.
  useEffect(() => {
    const t = setInterval(() => void persist(), 30_000);
    return () => clearInterval(t);
  }, [persist]);

  const q = props.questions.find((x) => x.no === current)!;
  const qUploads = uploads[q.no] ?? [];
  const spent = Math.round(timeSplit[q.no] ?? 0);

  const addSheet = async (blob: Blob) => {
    setCropping(null);
    const path = `${props.viewerId}/mock-${props.attemptId}/q${q.no}-${Date.now()}.${extFor(blob)}`;
    const { error: upErr } = await supabaseBrowser().storage.from("sheets").upload(path, blob, { contentType: blob.type });
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      return;
    }
    const next = { ...uploads, [q.no]: [...qUploads, path] };
    setUploads(next);
    setThumbs((t) => ({ ...t, [path]: URL.createObjectURL(blob) }));
    await persist(next);
  };

  const pause = () => {
    const t = Date.now();
    pausedAtRef.current = t;
    setPausedAt(t);
    void persist();
  };
  const resume = () => {
    if (!pausedAt) return;
    const total = pausedMs + (Date.now() - pausedAt);
    pausedAtRef.current = null;
    lastTick.current = Date.now();
    setPausedAt(null);
    setPausedMs(total);
    void persist(uploads, objective, timeSplit, total);
  };

  if (pausedAt) {
    return (
      <PauseOverlay
        onResume={resume}
        onExit={() => void persist(uploads, objective, timeSplit, pausedMs + (Date.now() - pausedAt))}
        exitHref="/mocks"
        exitLabel="Save & leave (the clock stays stopped)"
        note={props.mode === "screen" ? `Time left when you resume: ${hms(left)}. In the real exam there is no pause, so keep breaks short.` : "Paper mode: pause stops the per-question timing."}
      />
    );
  }

  if (cropping) return <CropEditor file={cropping} onCancel={() => setCropping(null)} onDone={addSheet} />;

  if (marking) {
    const drawing = props.questions.filter((x) => x.kind === "drawing");
    const ready = drawing.every((x) => typeof selfMarks[x.no] === "number");
    return (
      <div className="space-y-5">
        <Card>
          <CardLabel>Mark your own paper</CardLabel>
          <p className="mt-1 text-sm text-ink-2">Be a strict examiner. GB will review and his marks replace yours. Objective answers are marked automatically.</p>
        </Card>
        {drawing.map((x) => (
          <Card key={x.no}>
            <div className="flex items-baseline justify-between">
              <p className="font-medium">Q{x.no} · {x.title}</p>
              <span className="tabular-nums text-sm text-ink-2">{selfMarks[x.no] ?? "–"}/{x.marks}</span>
            </div>
            <p className="text-xs text-ink-3">{(uploads[x.no] ?? []).length} sheet(s) · {Math.round((timeSplit[x.no] ?? 0) / 60)} of {x.suggestedMinutes} suggested min</p>
            <input
              type="range" min={0} max={x.marks} step={0.5} value={selfMarks[x.no] ?? 0}
              onChange={(e) => setSelfMarks((m) => ({ ...m, [x.no]: Number(e.target.value) }))}
              aria-label={`Marks for question ${x.no}`} className="mt-3 w-full accent-[var(--accent)]"
            />
          </Card>
        ))}
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button className="w-full" disabled={!ready || pending} onClick={() => start(async () => {
          const r = await submitMock({ attemptId: props.attemptId, uploads, objective, timeSplit, selfMarks });
          if (!r.ok) setError(r.error ?? "Couldn't submit");
          else router.push(`/mocks/attempt/${props.attemptId}/result`);
        })}>
          {pending ? "Submitting…" : "Submit mock"}
        </Button>
        <button type="button" className="w-full text-sm text-ink-3 underline" onClick={() => setMarking(false)}>Back to the paper</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className={cn("sticky top-0 z-10 -mx-4 border-b px-4 py-3 backdrop-blur md:top-[57px]", left < 600 && props.mode === "screen" ? "border-bad bg-bad-soft/95" : "border-line bg-paper/95")}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-serif text-2xl tabular-nums">
            <Clock className="size-5" aria-hidden />
            {props.mode === "screen" ? (left >= 0 ? hms(left) : `+${hms(left)}`) : "Paper mode"}
          </span>
          <span className="flex gap-2">
            <Button variant="ghost" className="min-h-10 border border-line px-3" onClick={pause} aria-label="Pause mock">
              <Pause className="size-4" aria-hidden /> Pause
            </Button>
            <Button variant="secondary" className="min-h-10" onClick={() => { void persist(); setMarking(true); }}>Finish</Button>
          </span>
        </div>
        <nav aria-label="Questions" className="mt-3 flex gap-1.5 overflow-x-auto">
          {props.questions.map((x) => {
            const done = x.kind === "objective" ? Object.keys(objective).length > 0 : (uploads[x.no] ?? []).length > 0;
            return (
              <button key={x.no} type="button" onClick={() => { void persist(); setCurrent(x.no); }}
                className={cn("flex min-h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm", x.no === current ? "border-accent bg-accent text-accent-ink" : done ? "border-good bg-good-soft text-good" : "border-line bg-surface")}
                aria-current={x.no === current}>
                {done && x.no !== current && <CheckCircle2 className="size-3.5" aria-hidden />}Q{x.no}
              </button>
            );
          })}
        </nav>
      </div>
      {left < 0 && props.mode === "screen" && <p role="alert" className="rounded-xl bg-ink p-3 text-sm text-paper">Time&apos;s up. Upload your last sheets and tap Finish.</p>}

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Q{q.no} · {q.marks} marks</Badge>
          <Badge>{q.title}</Badge>
          <span className={cn("text-xs tabular-nums", spent > q.suggestedMinutes * 60 ? "text-bad" : "text-ink-3")}>{Math.floor(spent / 60)} / {q.suggestedMinutes} min</span>
        </div>
        <p className="mt-3 whitespace-pre-line text-lg leading-relaxed">{q.prompt}</p>
        {q.parts.length > 0 && (
          <ol className="mt-3 space-y-2">
            {q.parts.map((p) => (
              <li key={p.label} className="flex gap-2"><span className="font-medium">({p.label})</span><span className="flex-1">{p.prompt}</span><span className="text-sm text-ink-3">[{p.marks}]</span></li>
            ))}
          </ol>
        )}
      </Card>

      {q.kind === "objective" ? (
        <div className="space-y-6">
          {props.objectiveItems.map((it, i) => (
            <Card key={it.id}>
              <p className="mb-2 text-xs text-ink-3">{i + 1} of {props.objectiveItems.length}</p>
              <ItemView item={it} value={objective[it.id] ?? null} onChange={(v) => setObjective((o) => ({ ...o, [it.id]: v }))} />
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardLabel>Your sheets for Q{q.no}</CardLabel>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {qUploads.map((p, i) => (
              <div key={p} className="relative overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumbs[p] ? <img src={thumbs[p]} alt={`Q${q.no} sheet ${i + 1}`} className="aspect-[1/1.414] w-full object-cover" /> : <div className="aspect-[1/1.414] bg-surface-2" />}
                <button type="button" aria-label={`Remove sheet ${i + 1}`} className="absolute right-1 top-1 rounded-full bg-paper/90 p-1.5"
                  onClick={() => { const next = { ...uploads, [q.no]: qUploads.filter((x) => x !== p) }; setUploads(next); void persist(next); }}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[1/1.414] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-sm text-ink-2 hover:border-accent">
              <Camera className="size-6" aria-hidden /> Add sheet
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropping(f); e.target.value = ""; }} />
          <p className="mt-3 text-xs text-ink-3">{props.mode === "screen" ? "Draw on paper, then photograph each sheet. You can add sheets any time before you finish." : "Photograph every sheet you drew for this question."}</p>
        </Card>
      )}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  );
}
