import { expect, test } from "@playwright/test";
import { MENTOR, STUDENT } from "./helpers";

// Runs first. On a fresh database it performs the one-time setup; afterwards it checks the page is locked.
test("one-time setup creates both accounts, then locks", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/setup");
  if (await page.getByText("Setup is complete").isVisible()) {
    await expect(page.getByRole("link", { name: "Go to sign in" })).toBeVisible();
    return;
  }
  await expect(page.getByLabel("Username (used to sign in)").first()).toHaveValue("Veeru04");
  await page.getByLabel("Password").first().fill(STUDENT.password);
  await page.getByLabel("Username (used to sign in)").nth(1).fill(MENTOR.username);
  await page.getByLabel("Password").nth(1).fill(MENTOR.password);

  await page.getByLabel(/service_role/).fill("not-the-key");
  await page.getByRole("button", { name: /Create accounts/ }).click();
  await expect(page.getByText("isn't this project's")).toBeVisible();

  await page.getByLabel(/service_role/).fill(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  await page.getByRole("button", { name: /Create accounts/ }).click();
  await expect(page).toHaveURL(/\/login\?setup=done/, { timeout: 90_000 });
  await expect(page.getByText("Setup complete")).toBeVisible();

  await page.goto("/setup");
  await expect(page.getByText("Setup is complete")).toBeVisible();
});
