import { describe, it, expect } from "vitest";
import { resolveCandidates } from "@/lib/resolve";
import type { EntitySignal, ProviderResult } from "@/types/core";

function provider(id: string, items: { signals: EntitySignal[]; demo?: boolean }[]): ProviderResult {
  return {
    provider: id,
    providerLabel: id,
    category: "identity",
    status: "complete",
    query: "",
    timestamp: new Date().toISOString(),
    results: items.map((it) => ({ title: "x", sourceClass: "discovery", signals: it.signals, demo: it.demo })),
    sourceClass: "discovery",
    warnings: [],
  };
}

const userSignals: EntitySignal[] = [
  { kind: "name", value: "john smith" },
  { kind: "suburb", value: "Brisbane" },
  { kind: "state", value: "QLD" },
  { kind: "employer", value: "abc plumbing" },
];

describe("resolveCandidates", () => {
  it("labels a person record with the person's name, not their business", () => {
    const providers = [
      provider("demo", [
        {
          signals: [
            { kind: "name", value: "John Smith" },
            { kind: "business", value: "abc plumbing" },
            { kind: "suburb", value: "Brisbane" },
            { kind: "state", value: "QLD" },
            { kind: "employer", value: "abc plumbing" },
          ],
        },
      ]),
    ];
    const cands = resolveCandidates(userSignals, providers);
    expect(cands[0].displayName).toBe("John Smith");
  });

  it("ranks a stronger match above a conflicting one", () => {
    const providers = [
      provider("demo", [
        { signals: [{ kind: "name", value: "John Smith" }, { kind: "suburb", value: "Brisbane" }, { kind: "state", value: "QLD" }, { kind: "employer", value: "abc plumbing" }] },
        { signals: [{ kind: "name", value: "John Smith" }, { kind: "state", value: "NSW" }] },
      ]),
    ];
    const cands = resolveCandidates(userSignals, providers);
    expect(cands.length).toBe(2);
    expect(cands[0].confidence).toBeGreaterThan(cands[1].confidence);
  });

  it("ignores result items without signals", () => {
    const p = provider("x", []);
    p.results = [{ title: "no signals", sourceClass: "discovery" }];
    expect(resolveCandidates(userSignals, [p])).toEqual([]);
  });
});
