import { expect, test } from "@playwright/test";
import { MENTOR, STUDENT, login } from "./helpers";
import { sheetPhoto } from "./fixtures";

test.describe.configure({ mode: "serial" });

test("student takes a mini mock and gets analysis", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const photo = await sheetPhoto(browser);
  await login(page, STUDENT);
  await page.goto("/mocks");
  await page.getByRole("link", { name: /Mini mock 2/ }).click();
  await page.getByRole("button", { name: /Start with on-screen timer/ }).click();
  await page.waitForURL("**/mocks/attempt/**");
  await expect(page.getByText("Q1", { exact: false }).first()).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(photo);
  await page.getByRole("button", { name: /Use whole photo/ }).click();
  await expect(page.getByRole("img", { name: "Q1 sheet 1" })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "test-results/mock.png", fullPage: true });
  await page.getByRole("button", { name: "Finish" }).click();
  // No self-marking: just a check of what's uploaded, then submit.
  await expect(page.getByText("Ready to submit?")).toBeVisible();
  await expect(page.getByLabel(/Marks for question/)).toHaveCount(0);
  await page.getByRole("button", { name: "Submit mock" }).click();
  await page.waitForURL("**/result", { timeout: 30_000 });
  await expect(page.getByText(/Drawing questions are waiting for GB/)).toBeVisible();
  // Retake: the mock page lists the attempt and offers a fresh one.
  await page.getByRole("link", { name: /Retake this mock/ }).click();
  await expect(page.getByText("Your attempts")).toBeVisible();
  await expect(page.getByRole("button", { name: /Start with on-screen timer/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Paper analysis")).toBeVisible();
  await expect(page.getByText("Ideal approach:").first()).toBeVisible();
  await page.screenshot({ path: "test-results/mock-result.png", fullPage: true });
});

test("mentor marks the mock", async ({ page }) => {
  await login(page, MENTOR);
  await page.goto("/admin/mocks");
  await page.getByRole("link", { name: /Mini mock 2/ }).click();
  await page.getByRole("spinbutton").first().fill("12");
  await page.getByRole("button", { name: "Save marks" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();
});

test("progress page and mentor overview render", async ({ page, browser }) => {
  await login(page, STUDENT);
  await page.goto("/progress");
  await expect(page.getByText("100-day calendar")).toBeVisible();
  await expect(page.getByText("Readiness").first()).toBeVisible();
  await page.screenshot({ path: "test-results/progress.png", fullPage: true });

  const ctx = await browser.newContext();
  const m = await ctx.newPage();
  await login(m, MENTOR);
  await expect(m.getByText("Today's summary (send at 9 pm)")).toBeVisible();
  await expect(m.getByText(/Day 3 summary/)).toBeVisible();
  await m.screenshot({ path: "test-results/mentor.png", fullPage: true });
  await ctx.close();
});
