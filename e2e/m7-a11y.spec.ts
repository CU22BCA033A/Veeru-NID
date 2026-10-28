import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { MENTOR, STUDENT, login } from "./helpers";

const STUDENT_PAGES = ["/", "/studio", "/studio/portfolio", "/learn", "/learn/colour.harmony", "/progress", "/mocks", "/notebook", "/homework", "/interview", "/more", "/journal", "/exam-day"];
const MENTOR_PAGES = ["/admin", "/admin/review", "/admin/content", "/admin/images", "/admin/settings", "/admin/mocks"];

for (const scheme of ["light", "dark"] as const) {
  test(`no serious accessibility issues (${scheme})`, async ({ page, browser }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: scheme });
    const problems: string[] = [];
    const scan = async (p: typeof page, path: string) => {
      await p.goto(path);
      await p.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      for (const v of violations.filter((v) => v.impact === "serious" || v.impact === "critical"))
        problems.push(`${path} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    };
    await login(page, STUDENT);
    for (const path of STUDENT_PAGES) await scan(page, path);
    const ctx = await browser.newContext({ colorScheme: scheme });
    const m = await ctx.newPage();
    await login(m, MENTOR);
    for (const path of MENTOR_PAGES) await scan(m, path);
    await ctx.close();
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
