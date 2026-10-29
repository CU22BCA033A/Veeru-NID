"use client";
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Camera, Check, Save, Search, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LICENSE_NOT_RECORDED } from "@/lib/content/image-license";
import { compressImage, extFor } from "@/lib/image/compress";
import { supabaseBrowser } from "@/lib/supabase/client";
import { markImageReady, removeImage, saveImageDetails } from "./actions";

export interface ImageRow {
  id: string;
  description: string;
  shotNotes: string;
  aspect: string;
  status: "needed" | "ready";
  url: string | null;
  license: string | null;
  author: string | null;
  sourceUrl: string | null;
  openSource: string | null;
  usedBy: number;
}

const LICENSES = ["Own photo", "CC0", "Public domain", "CC BY 4.0", "CC BY-SA 4.0", "CC BY 3.0", "CC BY-SA 3.0", "Unsplash License", "Pexels License", "Pixabay License"];

/** Production hides server error details; say something useful instead. */
function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return /Server Components render|digest/i.test(m) ? "the server couldn't save it. Check your connection and try again." : m;
}

export function ImageCard({ img, mentorName }: { img: ImageRow; mentorName: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [license, setLicense] = useState(img.license ?? "Own photo");
  const [author, setAuthor] = useState(img.author ?? mentorName);
  // Older databases stored the search hint here; only a real web address counts as a source.
  const [source, setSource] = useState(/^https?:\/\//i.test(img.sourceUrl ?? "") ? img.sourceUrl! : "");
  const [status, setStatus] = useState<string | null>(null);
  // openSource reads like "Wikimedia Commons — search 'sitar instrument'".
  const searchTerm = img.openSource?.match(/search '([^']+)'/)?.[1] ?? null;
  const searchUrl = searchTerm ? `https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=${encodeURIComponent(searchTerm)}` : null;
  const [preview, setPreview] = useState<string | null>(img.url);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      if (license !== "Own photo" && !source.trim()) {
        setStatus("Paste the photo's source link first (the Wikimedia page address), then upload.");
        return;
      }
      try {
        setStatus("Compressing…");
        const blob = await compressImage(file);
        const path = `${img.id}-${Date.now()}.${extFor(blob)}`;
        setStatus(`Uploading ${Math.round(blob.size / 1024)} KB…`);
        const { error } = await supabaseBrowser().storage.from("content-images").upload(path, blob, { contentType: blob.type, upsert: true });
        if (error) throw error;
        const res = await markImageReady({ id: img.id, path, license, author, sourceUrl: license === "Own photo" ? "" : source });
        if (res.error) throw new Error(res.error);
        setPreview(URL.createObjectURL(blob));
        setStatus("Uploaded ✓ Questions using it are now live.");
      } catch (e) {
        setStatus(`Failed: ${friendly(e)}`);
      }
    });

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex aspect-[4/3] items-center justify-center bg-surface-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={img.description} className="h-full w-full object-contain" />
        ) : (
          <Camera className="size-10 text-ink-3" aria-hidden />
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <code className="text-xs text-ink-3">{img.id}</code>
          {preview ? <Badge tone="good"><Check className="mr-1 size-3" aria-hidden />Ready</Badge> : <Badge tone="warn">Needed</Badge>}
        </div>
        <p className="text-sm font-medium">{img.description}</p>
        <p className="text-xs leading-relaxed text-ink-2">{img.shotNotes}</p>
        <p className="text-xs text-ink-3">Aspect {img.aspect} · used by {img.usedBy} question{img.usedBy === 1 ? "" : "s"}</p>
        {searchUrl && (
          <a href={searchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm text-accent underline-offset-2 hover:underline">
            <Search className="size-4" aria-hidden /> Find a free photo: “{searchTerm}”
          </a>
        )}
        {preview && license === LICENSE_NOT_RECORDED && (
          <p className="flex items-start gap-2 rounded-lg bg-warn-soft p-2 text-xs text-warn">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Recovered upload: its licence wasn't saved. Pick the licence, add the source link, then tap Save details.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-2">
            Licence
            <select value={license} onChange={(e) => setLicense(e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm">
              {license === LICENSE_NOT_RECORDED && <option value={LICENSE_NOT_RECORDED} disabled>Pick the licence…</option>}
              {LICENSES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="text-xs text-ink-2">
            Author / credit
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm" />
          </label>
        </div>
        {license !== "Own photo" && (
          <label className="block text-xs text-ink-2">
            Source link (required for open-licence photos)
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://commons.wikimedia.org/…" className="mt-1 block min-h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm" />
          </label>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        <div className="flex gap-2">
          <Button onClick={() => fileRef.current?.click()} disabled={pending} className="flex-1">
            <Upload className="size-4" aria-hidden /> {preview ? "Replace" : "Upload"}
          </Button>
          {preview && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => start(async () => {
                const r = await saveImageDetails({ id: img.id, license, author, sourceUrl: license === "Own photo" ? "" : source });
                setStatus(r.error ? `Not saved: ${r.error}` : "Details saved ✓");
              })}
            >
              <Save className="size-4" aria-hidden /> Save details
            </Button>
          )}
          {preview && (
            <Button variant="ghost" aria-label="Remove photo" disabled={pending} onClick={() => start(async () => { await removeImage(img.id); setPreview(null); setStatus("Removed."); })}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </div>
        {status && <p role="status" className="text-xs text-ink-2">{status}</p>}
      </div>
    </article>
  );
}
