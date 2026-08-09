import { describe, it, expect } from "vitest";
import { scoreConfidence } from "@/lib/confidence";
import type { EntitySignal } from "@/types/core";

const user: EntitySignal[] = [
  { kind: "name", value: "john smith" },
  { kind: "suburb", value: "Brisbane" },
  { kind: "state", value: "QLD" },
  { kind: "employer", value: "abc plumbing" },
];

describe("scoreConfidence", () => {
  it("scores a strong multi-signal match high", () => {
    const cand: EntitySignal[] = [
      { kind: "name", value: "John Smith" },
      { kind: "suburb", value: "brisbane" },
      { kind: "state", value: "QLD" },
      { kind: "employer", value: "ABC Plumbing" },
      { kind: "phone", value: "+61712345678" },
    ];
    const r = scoreConfidence(user, cand);
    expect(r.confidence).toBeGreaterThanOrEqual(70);
    expect(r.evidence.some((e) => e.polarity === "match")).toBe(true);
  });

  it("scores a name-only match low", () => {
    const r = scoreConfidence(user, [{ kind: "name", value: "John Smith" }]);
    expect(r.confidence).toBeLessThan(45);
    expect(r.confidence).toBeGreaterThanOrEqual(5);
  });

  it("penalises a conflicting state", () => {
    const r = scoreConfidence(user, [
      { kind: "name", value: "John Smith" },
      { kind: "state", value: "NSW" },
    ]);
    const nameOnly = scoreConfidence(user, [{ kind: "name", value: "John Smith" }]).confidence;
    expect(r.confidence).toBeLessThan(nameOnly);
    expect(r.evidence.some((e) => e.polarity === "conflict")).toBe(true);
  });

  it("never returns 0 or 100", () => {
    expect(scoreConfidence(user, []).confidence).toBe(5);
    const huge = scoreConfidence(user, user.concat([{ kind: "phone", value: "x" }, { kind: "email", value: "x" }]));
    expect(huge.confidence).toBeLessThanOrEqual(97);
  });
});
