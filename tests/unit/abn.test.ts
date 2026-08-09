import { describe, it, expect } from "vitest";
import { normaliseAbn, normaliseAcn } from "@/lib/validation/abn";

describe("normaliseAbn (official checksum)", () => {
  it("accepts a valid ABN with spaces", () => {
    const a = normaliseAbn("51 824 753 556");
    expect(a.valid).toBe(true);
    expect(a.abn).toBe("51824753556");
    expect(a.display).toBe("51 824 753 556");
  });

  it("rejects wrong length", () => {
    expect(normaliseAbn("1234").valid).toBe(false);
    expect(normaliseAbn("518247535560").valid).toBe(false);
  });

  it("rejects a checksum failure", () => {
    expect(normaliseAbn("51824753557").valid).toBe(false);
  });
});

describe("normaliseAcn (official checksum)", () => {
  it("accepts a valid ACN", () => {
    const a = normaliseAcn("004 085 616");
    expect(a.valid).toBe(true);
    expect(a.acn).toBe("004085616");
  });

  it("rejects a checksum failure", () => {
    expect(normaliseAcn("004085617").valid).toBe(false);
  });
});
