import { describe, expect, it } from "vitest";
import { normaliseSupabaseUrl } from "@/lib/supabase/env";

describe("normaliseSupabaseUrl", () => {
  const root = "https://abcd.supabase.co";
  it.each([
    root,
    `${root}/`,
    `${root}/rest/v1/`,
    `${root}/rest/v1`,
    `${root}/auth/v1`,
    ` ${root}/rest/v1/ `,
    `"${root}"`,
  ])("reduces %s to the project root", (raw) => expect(normaliseSupabaseUrl(raw)).toBe(root));
  it("keeps local URLs and empty values", () => {
    expect(normaliseSupabaseUrl("http://127.0.0.1:54321")).toBe("http://127.0.0.1:54321");
    expect(normaliseSupabaseUrl("")).toBeUndefined();
    expect(normaliseSupabaseUrl(undefined)).toBeUndefined();
  });
});
