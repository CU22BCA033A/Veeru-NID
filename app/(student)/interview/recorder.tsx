"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { analyseSpeech } from "@/lib/interview/analyse";
import { supabaseBrowser } from "@/lib/supabase/client";
import { saveInterviewAnswer } from "./actions";

type SR = { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onend: (() => void) | null };

export function Recorder({ question, viewerId }: { question: string; viewerId: string }) {
  const [state, setState] = useState<"idle" | "recording" | "review">("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rec = useRef<MediaRecorder | null>(null);
  const sr = useRef<SR | null>(null);
  const finalText = useRef("");
  const t0 = useRef(0);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - t0.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [state]);

  const begin = async () => {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setBlob(new Blob(chunks, { type: r.mimeType || "audio/webm" }));
      };
      r.start();
      rec.current = r;
      // Free browser speech-to-text (Chrome/Android) for pace and filler feedback.
      const Ctor = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
      finalText.current = "";
      setTranscript("");
      if (Ctor) {
        const s = new Ctor();
        s.continuous = true;
        s.interimResults = true;
        s.lang = "en-IN";
        s.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i]!;
            if (res.isFinal) finalText.current += `${res[0].transcript} `;
            else interim += res[0].transcript;
          }
          setTranscript(finalText.current + interim);
        };
        s.onend = () => { if (rec.current?.state === "recording") try { s.start(); } catch { /* already running */ } };
        s.start();
        sr.current = s;
      }
      t0.current = Date.now();
      setSeconds(0);
      setState("recording");
    } catch {
      setMsg("Microphone not available. Allow microphone access in your browser settings.");
    }
  };

  const stop = () => {
    rec.current?.stop();
    rec.current = null;
    sr.current?.stop();
    sr.current = null;
    setState("review");
  };

  const stats = state === "review" && transcript ? analyseSpeech(transcript, seconds) : null;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        {state === "recording" ? (
          <>
            <p className="font-serif text-6xl tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-sm text-bad"><span className="size-2 animate-pulse rounded-full bg-bad" aria-hidden />Recording</p>
            <Button className="mt-4" onClick={stop}><Square className="size-4" aria-hidden />Stop</Button>
          </>
        ) : state === "review" ? (
          <>
            {blob && <audio controls src={URL.createObjectURL(blob)} className="mx-auto w-full" />}
            <button type="button" onClick={() => { setState("idle"); setBlob(null); }} className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm text-ink-2 underline"><RotateCcw className="size-3.5" aria-hidden />Record again</button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-2">Think for 15 seconds, then answer out loud as if you&apos;re in the interview. Aim for 45–90 seconds.</p>
            <Button className="mt-4" onClick={begin}><Mic className="size-4" aria-hidden />Start recording</Button>
          </>
        )}
      </Card>
      {msg && <p role="alert" className="text-sm text-bad">{msg}</p>}

      {state !== "idle" && transcript && (
        <Card>
          <CardLabel>What you said (auto transcript)</CardLabel>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{transcript}</p>
        </Card>
      )}

      {stats && (
        <Card>
          <CardLabel>Instant feedback</CardLabel>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div><dt className="text-xs text-ink-2">Length</dt><dd className="font-serif text-2xl">{seconds}s</dd></div>
            <div><dt className="text-xs text-ink-2">Pace</dt><dd className="font-serif text-2xl">{stats.wpm ?? "–"}<span className="text-xs"> wpm</span></dd></div>
            <div><dt className="text-xs text-ink-2">Fillers</dt><dd className="font-serif text-2xl">{stats.fillers.reduce((s, f) => s + f.count, 0)}</dd></div>
          </dl>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{stats.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </Card>
      )}

      {state === "review" && (
        <Card>
          <CardLabel>Save for GB</CardLabel>
          <p className="mt-1 text-sm text-ink-2">GB listens to your recording and gives feedback. You don&apos;t mark yourself.</p>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">Note to self<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 block w-full rounded-xl border border-line bg-surface p-2" /></label>
          </div>
          <Button className="mt-4 w-full" disabled={pending || !blob} onClick={() => start(async () => {
            let path: string | null = null;
            if (blob) {
              path = `${viewerId}/interview/${Date.now()}.webm`;
              const { error } = await supabaseBrowser().storage.from("sheets").upload(path, blob, { contentType: blob.type || "audio/webm" });
              if (error) { setMsg(error.message); return; }
            }
            const r = await saveInterviewAnswer({ question, audioPath: path, transcript, durationS: seconds, selfRating: {}, notes });
            if (!r.ok) setMsg(r.error ?? "Couldn't save");
            else { setMsg("Saved ✓ GB can listen and comment."); setState("idle"); setBlob(null); setNotes(""); }
          })}>{pending ? "Saving…" : "Save this answer"}</Button>
          {msg && <p role="status" className="mt-2 text-sm text-good">{msg}</p>}
        </Card>
      )}
    </div>
  );
}
