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
  test.setTimeout(480_000);
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
  // Answer two, leave, and the Today page offers to continue from question 3.
  for (let i = 0; i < 2; i++) {
    await page.locator('[role="radio"]:not([disabled]), [role="checkbox"]:not([disabled])').locator("visible=true").first().click();
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await page.goto("/");
  const resume = page.getByRole("link", { name: /Continue: Day 3 test/ });
  await expect(resume).toContainText("2 of");
  await expect(resume).toContainText("question 3");
  await resume.click();
  await page.waitForURL("**/test/questions");
  await answerAll(page, /Submit & see results/);
  await page.waitForURL("**/day/3/result", { timeout: 60_000 });
  await expect(page.getByText("Every question, explained")).toBeVisible();
  await page.screenshot({ path: "test-results/result.png", fullPage: true });

  // Retake: same questions as practice, with its own results page.
  await page.getByRole("link", { name: /Retake this test/ }).click();
  await page.waitForURL("**/retake?**");
  await answerAll(page, /Finish retake/);
  await page.waitForURL("**/retake/done**", { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Retake: \d+\/\d+/ })).toBeVisible();
  await page.goto("/day/3/result");

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
