import { describe, it, expect } from "vitest";
import { normaliseName, comparisonKey } from "@/lib/validation/name";

describe("normaliseName", () => {
  it("accepts hyphens and apostrophes", () => {
    expect(normaliseName("O'Brien-Smith").valid).toBe(true);
    expect(normaliseName("Renée").valid).toBe(true);
    expect(normaliseName("van der Berg").valid).toBe(true);
  });

  it("collapses whitespace", () => {
    expect(normaliseName("  John   Smith ").display).toBe("John Smith");
  });

  it("rejects digits and symbols", () => {
    expect(normaliseName("John3").valid).toBe(false);
    expect(normaliseName("<script>").valid).toBe(false);
    expect(normaliseName("").valid).toBe(false);
  });

  it("comparison key strips accents & case", () => {
    expect(comparisonKey("Renée")).toBe("renee");
    expect(comparisonKey("O'Brien")).toBe("obrien");
    expect(comparisonKey("Van Der Berg")).toBe("van der berg");
  });
});

describe("validateAndNormalise (person)", () => {
  it("requires first and last name", async () => {
    const { validateAndNormalise } = await import("@/lib/validation");
    const r = validateAndNormalise({ type: "person", firstName: "John" });
    expect(r.ok).toBe(false);
    expect(r.errors.lastName).toBeTruthy();
  });

  it("normalises a full person and emits signals", async () => {
    const { validateAndNormalise } = await import("@/lib/validation");
    const r = validateAndNormalise({
      type: "person",
      firstName: "John",
      lastName: "Smith",
      phone: "0412 345 678",
      suburb: "Brisbane",
      state: "qld",
    });
    expect(r.ok).toBe(true);
    expect(r.normalised.fullName).toBe("John Smith");
    expect(r.normalised.state).toBe("QLD");
    expect(r.signals.find((s) => s.kind === "phone")?.value).toBe("+61412345678");
  });
});
