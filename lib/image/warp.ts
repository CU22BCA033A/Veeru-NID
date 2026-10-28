"use client";
import { apply, homography, outputSize, type P } from "./homography";
import { decode, encode } from "./compress";

/**
 * Straighten the sheet inside `quad` (TL, TR, BR, BL in source-image pixels) to a flat A-series
 * page, lift the paper to white a little, and encode as WebP.
 */
export async function warpSheet(file: Blob, quad: P[], longSide = 1600): Promise<Blob> {
  const bmp = await decode(file);
  // Work on a copy no larger than ~2200px for speed.
  const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
  const sw = Math.round(bmp.width * scale), sh = Math.round(bmp.height * scale);
  const src = document.createElement("canvas");
  src.width = sw;
  src.height = sh;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(bmp, 0, 0, sw, sh);
  bmp.close();
  const sdata = sctx.getImageData(0, 0, sw, sh).data;
  const q = quad.map((p) => ({ x: p.x * scale, y: p.y * scale }));
  const { w, h } = outputSize(q, longSide);
  const H = homography([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], q);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = apply(H, { x: x + 0.5, y: y + 0.5 });
      const sx = Math.min(sw - 1, Math.max(0, Math.round(s.x)));
      const sy = Math.min(sh - 1, Math.max(0, Math.round(s.y)));
      const si = (sy * sw + sx) * 4, di = (y * w + x) * 4;
      d[di] = sdata[si]!;
      d[di + 1] = sdata[si + 1]!;
      d[di + 2] = sdata[si + 2]!;
      d[di + 3] = 255;
    }
  }
  whiten(d);
  octx.putImageData(img, 0, 0);
  return encode(out, 0.8);
}

/** Gentle levels stretch so grey phone-photo paper reads as white and pencil stays visible. */
function whiten(d: Uint8ClampedArray) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[(d[i]! * 299 + d[i + 1]! * 587 + d[i + 2]! * 114) / 1000 | 0]!++;
  const total = d.length / 4;
  let acc = 0, white = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v]!;
    if (acc > total * 0.35) { white = v; break; } // the paper is the brightest third of the page
  }
  const k = 255 / Math.max(120, white);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i]! * k);
    d[i + 1] = Math.min(255, d[i + 1]! * k);
    d[i + 2] = Math.min(255, d[i + 2]! * k);
  }
}
