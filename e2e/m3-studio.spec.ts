import { expect, test } from "@playwright/test";
import { MENTOR, STUDENT, login, setToday } from "./helpers";
import { sheetPhoto } from "./fixtures";

test.describe.configure({ mode: "serial" });

test("student completes a studio task with photo upload and self-assessment", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await setToday(3);
  const photo = await sheetPhoto(browser);
  await login(page, STUDENT);
  await page.goto("/studio?cat=Symbol");
  await page.getByRole("link", { name: /Symbol for/ }).first().click({ position: { x: 24, y: 24 } }); // its centre can sit under the bottom tab bar
  await expect(page.getByText("The brief", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Start 15-minute timer/ }).click();
  await expect(page.getByText("Time left")).toBeVisible();
  await page.getByRole("button", { name: /I'm done/ }).click();
  await page.locator('input[type="file"]').setInputFiles(photo);
  await expect(page.getByText(/Drag the four dots/)).toBeVisible();
  await page.screenshot({ path: "test-results/crop.png", fullPage: true });
  await page.getByRole("button", { name: /Straighten & add page/ }).click();
  await expect(page.getByRole("img", { name: "Page 1" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Rate yourself/ }).click();
  for (const legend of ["Idea & originality", "Understanding of the brief", "Communication clarity", "Drawing skill", "Composition & use of space", "Labels, captions, word limits"]) {
    await page.getByRole("group", { name: new RegExp(legend) }).getByRole("button", { name: "4", exact: true }).click();
  }
  await page.getByRole("button", { name: "Submit for feedback" }).click();
  await page.waitForURL("**/studio/submission/**", { timeout: 30_000 });
  await expect(page.getByText("Waiting for GB's review.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Sheet 1" })).toBeVisible();
  await page.screenshot({ path: "test-results/submission.png", fullPage: true });

  await page.goto("/studio/portfolio");
  await expect(page.getByText(/\d+ sheets?/)).toBeVisible();
});

test("mentor reviews the sheet and the student sees GB's score", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await login(page, MENTOR);
  await page.goto("/admin/review");
  await page.getByRole("link", { name: /Symbol for/ }).first().click({ position: { x: 24, y: 24 } }); // its centre can sit under the bottom tab bar
  for (const legend of ["Idea & originality", "Understanding of the brief", "Communication clarity", "Drawing skill", "Composition & use of space"]) {
    await page.getByRole("group", { name: new RegExp(legend) }).getByRole("button", { name: "6", exact: true }).click();
  }
  await page.getByRole("group", { name: /Labels, captions, word limits/ }).getByRole("button", { name: "3", exact: true }).click();
  await page.getByLabel(/Comment for Veeru/).fill("Strong idea. Make the symbol bolder so it reads at stamp size.");
  await page.getByRole("button", { name: /Save/ }).click();
  await page.waitForTimeout(1500);

  const ctx = await browser.newContext();
  const s = await ctx.newPage();
  await login(s, STUDENT);
  await s.goto("/studio/portfolio");
  await s.waitForLoadState("networkidle");
  await s.getByRole("link", { name: /Symbol for/ }).first().click({ position: { x: 24, y: 24 } }); // its centre can sit under the bottom tab bar
  await expect(s.getByText("GB says")).toBeVisible();
  await expect(s.getByText(/Calibration: you rated yourself/)).toBeVisible();
  await ctx.close();
});

test("sketch log records today's minutes", async ({ page }) => {
  await login(page, STUDENT);
  await page.goto("/studio/sketch");
  await page.getByRole("button", { name: "20", exact: true }).click();
  await page.getByRole("button", { name: "Log sketch" }).click();
  await expect(page.getByText(/Logged/)).toBeVisible();
});
