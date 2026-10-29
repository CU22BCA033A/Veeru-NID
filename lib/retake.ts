/** Link that runs the same questions again as practice (no homework, no rating change). */
export function retakeHref(itemIds: string[], label: string, back: string): string {
  const q = new URLSearchParams({ ids: itemIds.join(","), label, back, run: String(Date.now()) });
  return `/retake?${q.toString()}`;
}

export const RETAKE_MAX = 120;

/** Only same-site paths are allowed as the "back" target. */
export function safeBack(back: string | undefined, fallback = "/"): string {
  return back && back.startsWith("/") && !back.startsWith("//") ? back : fallback;
}
