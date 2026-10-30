import { expect, test } from "@playwright/test";
import { MENTOR, STUDENT, login } from "./helpers";

test("aptitude mock: 50 objective questions, auto-marked, not in GB's marking queue", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await login(page, STUDENT);
  await page.goto("/mocks");
  await expect(page.getByRole("heading", { name: /Aptitude & objective/ })).toBeVisible();
  await page.getByRole("link", { name: /Aptitude mock 1/ }).click();
  await expect(page.getByText(/50 questions, about a minute each/)).toBeVisible();
  await expect(page.getByRole("button", { name: /printed paper/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Start with on-screen timer/ }).click();
  await page.waitForURL("**/mocks/attempt/**");
  await expect(page.getByText("1 of 50", { exact: true })).toBeVisible();
  // Answer the first option of the first five questions (each card starts with "n of 50").
  for (let i = 1; i <= 5; i++) {
    const card = page.locator("div").filter({ has: page.getByText(`${i} of 50`, { exact: true }) }).last();
    await card.locator('[role="radio"], [role="checkbox"]').first().click();
  }
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByText(/5\/50 answered/)).toBeVisible();
  await page.getByRole("button", { name: "Submit mock" }).click();
  await page.waitForURL("**/result", { timeout: 30_000 });
  await expect(page.getByText("Marked automatically")).toBeVisible();

  const ctx = await browser.newContext();
  const m = await ctx.newPage();
  await login(m, MENTOR);
  await m.goto("/admin/mocks");
  await expect(m.getByRole("link", { name: /Aptitude mock 1/ }).first().getByText("Auto-marked")).toBeVisible();
  await ctx.close();
});
