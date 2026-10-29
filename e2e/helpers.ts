import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Test accounts for the LOCAL stack only. Never put real passwords here; override with env vars.
export const STUDENT = { username: process.env.E2E_STUDENT_USERNAME ?? "Veeru04", password: process.env.E2E_STUDENT_PASSWORD ?? "local-test-student-pw" };
export const MENTOR = { username: process.env.E2E_MENTOR_USERNAME ?? "GB-mentor", password: process.env.E2E_MENTOR_PASSWORD ?? "local-test-mentor-pw" };

export async function login(page: Page, who: { username: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(who.username);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** Move Day 1 so that today is day `n` (IST). */
export async function setToday(n: number) {
  const db = admin();
  const { data } = await db.from("settings").select("phases").eq("id", 1).single();
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const start = new Date(ist.getTime() - (n - 1) * 86_400_000).toISOString().slice(0, 10);
  await db.from("settings").update({ phases: { ...(data!.phases as object), startDate: start } }).eq("id", 1);
}

/** Answer every question in a Runner (first option / a typed list), then submit. */
export async function answerAll(page: Page, submitName: RegExp) {
  for (let i = 0; i < 120; i++) {
    const textarea = page.locator("textarea");
    if (await textarea.isVisible()) {
      await textarea.fill("1. a shelf for books\n2. a stand for plants\n3. a drying rack\n4. a step stool\n5. a display table\n6. a barrier");
    } else {
      await page.locator('[role="radio"]:not([disabled]), [role="checkbox"]:not([disabled])').locator("visible=true").first().click();
    }
    const submit = page.getByRole("button", { name: submitName });
    if (await submit.isVisible()) {
      await submit.click();
      return;
    }
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  throw new Error("runner did not finish");
}
