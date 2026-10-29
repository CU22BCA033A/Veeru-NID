import { expect, test } from "@playwright/test";
import { MENTOR, STUDENT, admin, login } from "./helpers";
import { sheetPhoto } from "./fixtures";

test("mentor uploads a question photo", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const photo = await sheetPhoto(browser);
  // Regression: a slot whose row isn't in the database yet (content not synced) must still save.
  await admin().from("images").delete().eq("id", "img-light-ball-left");
  await login(page, MENTOR);
  await page.goto("/admin/images");
  await page.waitForLoadState("networkidle"); // let the cards become interactive first
  const card = page.locator("article").filter({ has: page.locator("code", { hasText: /^img-light-ball-left$/ }) });
  await card.locator('input[type="file"]').setInputFiles(photo);
  await expect(card.getByText(/Uploaded ✓/)).toBeVisible({ timeout: 30_000 });
  const { data: row } = await admin().from("images").select("status,path").eq("id", "img-light-ball-left").single();
  expect(row?.status).toBe("ready");
  await page.reload();
  await expect(page.getByText(/1 of 104 photos uploaded/)).toBeVisible();
});

test("mentor imports a PYQ and rejects a duplicate", async ({ page }) => {
  await login(page, MENTOR);
  await page.goto("/admin/content?tab=import");
  const csv = 'stem,a,b,c,d,answer,explanation,subtopic,difficulty,year\n"Which of these colours is a secondary colour on the RYB wheel?",Red,Orange,Blue,Yellow,b,"Orange = red + yellow.",colour.wheel,1,2019';
  await page.getByRole("textbox").fill(csv);
  await page.getByRole("button", { name: "Import as PYQ" }).click();
  await expect(page.getByText(/Added 1/)).toBeVisible();
  await page.getByRole("textbox").fill(csv);
  await page.getByRole("button", { name: "Import as PYQ" }).click();
  await expect(page.getByText(/Added 0\. Skipped 1 near-duplicates/)).toBeVisible();
});

test("student pages: learn, notebook, interview, more", async ({ page }) => {
  await login(page, STUDENT);
  for (const [path, text] of [["/learn", "Exam strategy guides"], ["/learn/colour.harmony", "Colour harmonies"], ["/learn/guide/plan-three-hours", "Minutes per mark"], ["/notebook", "Mistake notebook"], ["/interview", "Interview practice"], ["/interview/iq-why-nid", "What a strong answer shows"], ["/more", "Why I want NID"], ["/journal", "Journal"], ["/mocks", "Mock exams"]] as const) {
    await page.goto(path);
    await expect(page.getByText(text).first()).toBeVisible();
  }
});
