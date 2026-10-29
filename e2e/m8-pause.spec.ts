import { expect, test } from "@playwright/test";
import { STUDENT, login } from "./helpers";

test("a practice test can be paused and resumed; the question is hidden while paused", async ({ page }) => {
  await login(page, STUDENT);
  await page.goto("/drill?subtopic=colour.harmony");
  await page.waitForLoadState("networkidle");
  const firstOption = page.locator('[role="radio"], [role="checkbox"], textarea').first();
  await expect(firstOption).toBeVisible();
  await page.getByRole("button", { name: "Pause test" }).click();
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
  await expect(firstOption).toBeHidden();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeHidden();
  await expect(firstOption).toBeVisible();
});

test("switching away from the app pauses a practice test", async ({ page }) => {
  await login(page, STUDENT);
  await page.goto("/drill?subtopic=colour.wheel");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
});

test("a mock's countdown stops while paused", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page, STUDENT);
  await page.goto("/mocks");
  await page.getByRole("link", { name: /Mini mock 3/ }).click();
  await page.getByRole("button", { name: /Start with on-screen timer/ }).click();
  await page.waitForURL("**/mocks/attempt/**");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Pause mock" }).click();
  const note = page.getByText(/Time left when you resume:/);
  await expect(note).toBeVisible();
  const before = await note.textContent();
  await page.waitForTimeout(3000);
  expect(await note.textContent()).toBe(before);
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Pause mock" })).toBeVisible();
});
