"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { P } from "@/lib/image/homography";
import { warpSheet } from "@/lib/image/warp";

/** Drag the 4 corners onto the corners of the paper, then straighten. */
export function CropEditor({ file, onDone, onCancel }: { file: File; onDone: (blob: Blob) => void; onCancel: () => void }) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [corners, setCorners] = useState<P[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    createImageBitmap(file, { imageOrientation: "from-image" }).then((b) => {
      if (!alive) return;
      const s = { w: b.width, h: b.height };
      b.close();
      setSize(s);
      const ix = s.w * 0.06, iy = s.h * 0.06;
      setCorners([{ x: ix, y: iy }, { x: s.w - ix, y: iy }, { x: s.w - ix, y: s.h - iy }, { x: ix, y: s.h - iy }]);
    });
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file, url]);

  const toImage = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * size!.w, y: ((e.clientY - r.top) / r.height) * size!.h };
  };

  const finish = async (quad: P[]) => {
    setBusy(true);
    setError(null);
    try {
      onDone(await warpSheet(file, quad));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process that photo");
      setBusy(false);
    }
  };

  if (!size || corners.length !== 4) return <p className="p-6 text-center text-ink-2">Loading photo…</p>;
  const r = Math.max(size.w, size.h) * 0.022;
  const labels = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Drag the four dots onto the corners of your sheet. It will be straightened and cleaned up.</p>
      <div className="relative mx-auto max-h-[65vh] overflow-hidden rounded-xl bg-ink" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Your photographed sheet" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerMove={(e) => {
            if (drag.current === null) return;
            const p = toImage(e);
            setCorners((c) => c.map((q, i) => (i === drag.current ? { x: Math.max(0, Math.min(size.w, p.x)), y: Math.max(0, Math.min(size.h, p.y)) } : q)));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
        >
          <polygon points={corners.map((c) => `${c.x},${c.y}`).join(" ")} fill="rgba(217,72,28,0.12)" stroke="#d9481c" strokeWidth={r * 0.25} />
          {corners.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={r}
              fill="#fff"
              stroke="#d9481c"
              strokeWidth={r * 0.3}
              role="slider"
              aria-label={`${labels[i]} corner`}
              aria-valuenow={Math.round(c.x)}
              tabIndex={0}
              onKeyDown={(e) => {
                const step = Math.max(size.w, size.h) * 0.01;
                const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
                if (!d) return;
                e.preventDefault();
                setCorners((cs) => cs.map((q, j) => (j === i ? { x: q.x + d[0]!, y: q.y + d[1]! } : q)));
              }}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture(e.pointerId);
                drag.current = i;
              }}
              style={{ cursor: "grab" }}
            />
          ))}
        </svg>
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => finish(corners)} disabled={busy} className="flex-1">
          <Check className="size-4" aria-hidden /> {busy ? "Straightening…" : "Straighten & add page"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => finish([{ x: 0, y: 0 }, { x: size.w, y: 0 }, { x: size.w, y: size.h }, { x: 0, y: size.h }])}>
          <Maximize className="size-4" aria-hidden /> Use whole photo
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel} aria-label="Cancel">
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
