import { describe, it, expect } from "vitest";
import { normalisePhone, phoneVariants } from "@/lib/validation/phone";

describe("normalisePhone — Australian equivalence (§9)", () => {
  const forms = ["0412 345 678", "+61 412 345 678", "0412345678", "(04) 1234 5678"];
  it("maps equivalent AU mobile forms to the same E.164", () => {
    const e164s = forms.map((f) => normalisePhone(f).e164);
    expect(new Set(e164s)).toEqual(new Set(["+61412345678"]));
  });

  it("classifies a mobile", () => {
    const n = normalisePhone("0412345678");
    expect(n.valid).toBe(true);
    expect(n.kind).toBe("mobile");
    expect(n.national).toBe("0412345678");
    expect(n.display).toBe("0412 345 678");
  });

  it("classifies a landline with region", () => {
    const n = normalisePhone("02 9374 4000");
    expect(n.valid).toBe(true);
    expect(n.kind).toBe("landline");
    expect(n.e164).toBe("+61293744000");
    expect(n.region).toBe("NSW/ACT");
  });

  it("recovers a missing leading zero", () => {
    expect(normalisePhone("412345678").e164).toBe("+61412345678");
  });

  it("handles 1300 / 13 special services", () => {
    expect(normalisePhone("1300 975 707").kind).toBe("special");
    expect(normalisePhone("13 11 14").kind).toBe("special");
  });

  it("treats a real international number as international", () => {
    const n = normalisePhone("+1 415 555 2671");
    expect(n.valid).toBe(true);
    expect(n.kind).toBe("international");
    expect(n.e164).toBe("+14155552671");
  });

  it("rejects junk", () => {
    expect(normalisePhone("").valid).toBe(false);
    expect(normalisePhone("abc").valid).toBe(false);
    expect(normalisePhone("12").valid).toBe(false);
    expect(normalisePhone("0000").valid).toBe(false);
  });

  it("phoneVariants includes national and E.164", () => {
    const v = phoneVariants("0412 345 678");
    expect(v).toContain("0412345678");
    expect(v).toContain("+61412345678");
  });
});
