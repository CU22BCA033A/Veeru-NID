import type { Browser } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";

/** A fake photographed sheet: a white page with a drawing, on a darker table. */
export async function sheetPhoto(browser: Browser): Promise<string> {
  const path = "test-results/fixture-sheet.png";
  if (existsSync(path)) return path;
  mkdirSync("test-results", { recursive: true });
  const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
  await page.setContent(`<body style="margin:0;background:#6b5b4b"><div style="position:absolute;left:60px;top:50px;width:470px;height:680px;background:#f4f1ea;transform:rotate(-3deg)"><svg width="470" height="680"><circle cx="230" cy="300" r="120" fill="none" stroke="#333" stroke-width="4"/><path d="M120 520 L340 520" stroke="#333" stroke-width="4"/><text x="40" y="620" font-size="28" fill="#333">Q1 test sheet</text></svg></div></body>`);
  await page.screenshot({ path });
  await page.close();
  return path;
}
