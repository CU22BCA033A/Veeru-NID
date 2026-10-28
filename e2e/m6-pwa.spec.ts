import { expect, test } from "@playwright/test";
import { STUDENT, login } from "./helpers";

test("installable, and visited pages open offline", async ({ page, context, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);

  await login(page, STUDENT);
  await page.goto("/learn");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the worker, so this visit is cached
  await expect(page.getByRole("heading", { name: "Exam strategy guides" })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Exam strategy guides" })).toBeVisible();
  await page.goto("/journal");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
});
