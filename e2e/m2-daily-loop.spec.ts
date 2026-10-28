import { expect, test } from "@playwright/test";
import { STUDENT, admin, answerAll, login, setToday } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // fresh slate for the student's plans, then make today Day 3 (a weekday in P1)
  const db = admin();
  const { data: users } = await db.from("profiles").select("id").eq("role", "student");
  for (const u of users ?? []) {
    for (const t of ["attempts", "homework", "srs_cards", "served_items", "skill_ratings", "reflections", "studio_submissions", "daily_plans"]) {
      await db.from(t).delete().eq("user_id", u.id);
    }
  }
  await setToday(3);
});

test("warm-up → test → results → homework → reflection", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, STUDENT);
  await expect(page.getByRole("heading", { name: "Day 3 of 100" })).toBeVisible();
  await page.screenshot({ path: "test-results/home.png", fullPage: true });

  await page.getByRole("link", { name: /Start: Morning warm-up/ }).click();
  await page.waitForURL("**/warmup");
  await expect(page.getByRole("heading", { name: "Morning warm-up" })).toBeVisible();
  await page.screenshot({ path: "test-results/warmup.png", fullPage: true });
  await answerAll(page, /Finish warm-up/);
  await page.waitForURL("**/");

  await page.goto("/day/3/test");
  await expect(page.getByText("Part A · Questions")).toBeVisible();
  await page.getByText("Part A · Questions").click();
  await page.waitForURL("**/test/questions");
  await page.screenshot({ path: "test-results/question.png", fullPage: true });
  await answerAll(page, /Submit & see results/);
  await page.waitForURL("**/day/3/result", { timeout: 60_000 });
  await expect(page.getByText("Every question, explained")).toBeVisible();
  await page.screenshot({ path: "test-results/result.png", fullPage: true });

  const hw = page.getByRole("link", { name: /homework items ready/ });
  if (await hw.isVisible()) {
    await hw.click();
    await answerAll(page, /Finish homework/);
    await page.waitForURL("**/homework/done");
    await expect(page.getByText("Homework done")).toBeVisible();
  }

  await page.goto("/day/3/reflect");
  await page.getByRole("button", { name: "🙂" }).click();
  await page.getByRole("button", { name: "Good" }).click();
  await page.getByLabel("Hours slept last night").fill("7.5");
  await page.getByLabel(/what I learned today/).fill("Water images flip top to bottom.");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await expect(page.getByText("Saved. Well done today.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("img", { name: /of 6 steps done/ })).toBeVisible();
  await page.screenshot({ path: "test-results/home-after.png", fullPage: true });
});
