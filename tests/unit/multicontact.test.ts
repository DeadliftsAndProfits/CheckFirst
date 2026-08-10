import { describe, it, expect } from "vitest";
import { validateAndNormalise } from "@/lib/validation";
import { generateQueries } from "@/lib/query/generator";
import { scoreConfidence } from "@/lib/confidence";
import type { EntitySignal, SearchInput } from "@/types/core";

describe("multi-phone / multi-email schema (§15/§16)", () => {
  it("normalises multiple phones and emits a signal for each", () => {
    const r = validateAndNormalise({ type: "phone", phones: ["0412 345 678", "+61 2 9374 4000"] });
    expect(r.ok).toBe(true);
    const phoneSignals = r.signals.filter((s) => s.kind === "phone").map((s) => s.value);
    expect(phoneSignals).toContain("+61412345678");
    expect(phoneSignals).toContain("+61293744000");
    expect(r.normalised.phones).toContain(",");
  });

  it("ignores genuinely empty added fields", () => {
    const r = validateAndNormalise({ type: "phone", phones: ["0412 345 678", "", "  "] });
    expect(r.ok).toBe(true);
    expect(r.signals.filter((s) => s.kind === "phone")).toHaveLength(1);
  });

  it("flags an invalid added phone without blocking valid ones being recorded", () => {
    const r = validateAndNormalise({ type: "phone", phones: ["0412 345 678", "12"] });
    expect(r.ok).toBe(false);
    expect(r.errors.phone1).toBeTruthy();
    expect(r.normalised.phones).toContain("0412 345 678");
  });

  it("normalises multiple emails", () => {
    const r = validateAndNormalise({ type: "email", emails: ["A@Example.com", "b@test.com.au"] });
    expect(r.ok).toBe(true);
    expect(r.signals.filter((s) => s.kind === "email").map((s) => s.value)).toEqual(["a@example.com", "b@test.com.au"]);
  });

  it("merges singular + array (backwards compatible)", () => {
    const r = validateAndNormalise({ type: "person", firstName: "A", lastName: "B", phone: "0412345678", phones: ["0755551234"] });
    expect(r.signals.filter((s) => s.kind === "phone")).toHaveLength(2);
  });

  it("generateQueries includes every supplied phone", () => {
    const input: SearchInput = { type: "phone", phones: ["0412 345 678", "0755551234"] };
    const { normalised } = validateAndNormalise(input);
    const qs = generateQueries(input, normalised).join(" ");
    expect(qs).toContain("0412345678");
    expect(qs).toContain("0755551234");
  });
});

describe("independent corroboration (§16)", () => {
  const user: EntitySignal[] = [
    { kind: "phone", value: "+61412345678" },
    { kind: "phone", value: "+61755551234" },
  ];
  it("two independently-corroborated phones beat one", () => {
    const both = scoreConfidence(user, [
      { kind: "phone", value: "+61412345678" },
      { kind: "phone", value: "+61755551234" },
    ]).confidence;
    const one = scoreConfidence(user, [{ kind: "phone", value: "+61412345678" }]).confidence;
    expect(both).toBeGreaterThan(one);
  });

  it("does NOT inflate when the candidate only corroborates one", () => {
    // User typed two, but the record independently has only one → same as one.
    const oneMatch = scoreConfidence(user, [{ kind: "phone", value: "+61412345678" }]).confidence;
    const singleUser = scoreConfidence([{ kind: "phone", value: "+61412345678" }], [{ kind: "phone", value: "+61412345678" }]).confidence;
    expect(oneMatch).toBe(singleUser);
  });
});
