import { createCipheriv, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { decryptPack } = await import("@/lib/seed/packs");

function seal(payload: unknown, key: Buffer) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(gzipSync(Buffer.from(JSON.stringify(payload)))), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

describe("question-paper packs", () => {
  const key = randomBytes(32);
  const data = seal({ items: [{ id: "x" }], tasks: [], mocks: [] }, key);

  it("opens with the right key", () => {
    expect(decryptPack(data, key.toString("base64url")).items).toEqual([{ id: "x" }]);
  });
  it("refuses a wrong key with a clear message", () => {
    expect(() => decryptPack(data, randomBytes(32).toString("base64url"))).toThrow(/Wrong key/);
  });
  it("refuses a truncated key", () => {
    expect(() => decryptPack(data, "abc")).toThrow(/right length/);
  });
});
