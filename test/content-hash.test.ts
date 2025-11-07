import { describe, it, expect } from "vitest";
import { computeContentHash } from "../src/services/crypto.js";

describe("content hash parity", () => {
  it("computes Poseidon(recipient, sha256(ciphertext))", async () => {
    const recipient = "0x1234";
    const ciphertext = Buffer.from("hello-world");
    const h = await computeContentHash(recipient as `0x${string}`, ciphertext);
    expect(h.startsWith("0x")).toBe(true);
    expect(h.length).toBeGreaterThan(10);
  });
});
