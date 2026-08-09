import { describe, it, expect } from "vitest";
import { normaliseEmail } from "@/lib/validation/email";

describe("normaliseEmail", () => {
  it("accepts and lowercases", () => {
    const e = normaliseEmail("John.Smith@Example.COM.AU");
    expect(e.valid).toBe(true);
    expect(e.normalised).toBe("john.smith@example.com.au");
    expect(e.domain).toBe("example.com.au");
  });

  it("accepts plus-addressing", () => {
    expect(normaliseEmail("a+tag@gmail.com").valid).toBe(true);
  });

  it("rejects malformed", () => {
    for (const bad of ["", "no-at", "a@", "@b.com", "a@b", "a b@c.com", "a@b..com"]) {
      expect(normaliseEmail(bad).valid, bad).toBe(false);
    }
  });

  it("rejects over-long", () => {
    expect(normaliseEmail("a".repeat(300) + "@x.com").valid).toBe(false);
  });
});
