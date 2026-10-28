"use client";
import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, extFor } from "@/lib/image/compress";
import { supabaseBrowser } from "@/lib/supabase/client";
import { logSketch } from "../actions";

export function SketchForm({ viewerId }: { viewerId: string }) {
  const [minutes, setMinutes] = useState(15);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          let path: string | null = null;
          if (file) {
            const blob = await compressImage(file, 1400);
            path = `${viewerId}/sketch/${Date.now()}.${extFor(blob)}`;
            const { error } = await supabaseBrowser().storage.from("sheets").upload(path, blob, { contentType: blob.type });
            if (error) { setMsg(error.message); return; }
          }
          await logSketch({ minutes, imagePath: path });
          setFile(null);
          setMsg("Logged ✓ Keep the streak alive tomorrow.");
        });
      }}
    >
      <fieldset>
        <legend className="text-sm text-ink-2">Minutes sketched</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[15, 20, 30, 45, 60].map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={`min-h-11 rounded-xl border px-4 ${minutes === m ? "border-accent bg-accent-soft font-medium" : "border-line bg-surface"}`}>
              {m}
            </button>
          ))}
        </div>
      </fieldset>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button type="button" variant="secondary" onClick={() => ref.current?.click()}>
        <Camera className="size-4" aria-hidden /> {file ? "Photo added ✓" : "Add a photo (optional)"}
      </Button>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Log sketch"}</Button>
      {msg && <p role="status" className="text-sm text-good">{msg}</p>}
    </form>
  );
}
