import type { Figure } from "./geometry";

/** All puzzle art uses currentColor so it follows light/dark theme. */
export function svgDoc(w: number, h: number, body: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeAttr(label)}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Render a grid figure inside a box of `px` pixels, with optional frame. */
export function figureSvg(fig: Figure, label: string, opts: { px?: number; frame?: boolean; extra?: string } = {}): string {
  const px = opts.px ?? 120;
  const pad = 12;
  const k = (px - pad * 2) / fig.size;
  const X = (v: number) => (pad + v * k).toFixed(1);
  const lines = fig.segs.map((s) => `<line x1="${X(s.a.x)}" y1="${X(s.a.y)}" x2="${X(s.b.x)}" y2="${X(s.b.y)}" stroke-width="3"/>`).join("");
  const dots = fig.dots.map((d) => `<circle cx="${X(d.x)}" cy="${X(d.y)}" r="${(k * 0.28).toFixed(1)}" fill="currentColor" stroke="none"/>`).join("");
  const frame = opts.frame === false ? "" : `<rect x="2" y="2" width="${px - 4}" height="${px - 4}" rx="8" stroke-width="1" opacity="0.25"/>`;
  return svgDoc(px, px, frame + lines + dots + (opts.extra ?? ""), label);
}

/** Lay several SVG snippets in a row (used for series questions). */
export function rowSvg(cells: string[], cellPx: number, label: string, gap = 10): string {
  const w = cells.length * cellPx + (cells.length - 1) * gap;
  const body = cells.map((c, i) => `<g transform="translate(${i * (cellPx + gap)},0)">${c}</g>`).join("");
  return svgDoc(w, cellPx, body, label);
}

/** Strip the outer <svg> wrapper so a figure can be nested inside another drawing. */
export function inner(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}
