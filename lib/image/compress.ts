"use client";

/** Decode a photo (respecting phone EXIF rotation) into a bitmap. */
export async function decode(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

/** Encode a canvas as WebP (JPEG fallback for browsers that can't encode WebP). */
export async function encode(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!jpeg) throw new Error("Could not encode image");
  return jpeg;
}

/** Shrink to fit `maxSide` px and re-encode. Typical phone photo: 4 MB → ~200 KB. */
export async function compressImage(file: Blob, maxSide = 1600): Promise<Blob> {
  const bmp = await decode(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return encode(canvas);
}

export function extFor(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : "jpg";
}
