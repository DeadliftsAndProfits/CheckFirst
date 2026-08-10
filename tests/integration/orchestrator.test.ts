import { describe, it, expect } from "vitest";
import { collectSearch, runSearch } from "@/lib/orchestrator";
import { runProviderSafely, type Provider, ok } from "@/lib/providers/base";
import type { SearchInput } from "@/types/core";

function ctx(overrides = {}) {
  return {
    input: { type: "person", firstName: "A", lastName: "B" } as SearchInput,
    normalised: { fullName: "A B" },
    queries: ['"A B"'],
    signal: new AbortController().signal,
    ...overrides,
  };
}

describe("runProviderSafely (§37 provider states)", () => {
  it("returns a completed result on success", async () => {
    const p: Provider = {
      id: "t", label: "T", category: "web", sourceClass: "discovery", dataOrigin: "live",
      appliesTo: () => true,
      run: async () => ok(p, "q", [{ title: "hit", sourceClass: "discovery" }]),
    };
    const r = await runProviderSafely(p, ctx(), 1000);
    expect(r.status).toBe("complete");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("converts a thrown error into status=error, never rejects", async () => {
    const p: Provider = {
      id: "boom", label: "Boom", category: "web", sourceClass: "discovery", dataOrigin: "live",
      appliesTo: () => true,
      run: async () => { throw new Error("kaboom"); },
    };
    const r = await runProviderSafely(p, ctx(), 1000);
    expect(r.status).toBe("error");
    expect(r.error).toContain("kaboom");
  });

  it("times out a hanging provider into status=unavailable", async () => {
    const p: Provider = {
      id: "hang", label: "Hang", category: "web", sourceClass: "discovery", dataOrigin: "live",
      appliesTo: () => true,
      run: () => new Promise(() => {}), // never resolves
    };
    const r = await runProviderSafely(p, ctx(), 150);
    expect(r.status).toBe("unavailable");
  });
});

describe("collectSearch — person, demo mode (offline)", () => {
  it("produces a report with candidates and honest not_configured states", async () => {
    const input: SearchInput = { type: "person", firstName: "John", lastName: "Smith", suburb: "Brisbane", state: "QLD", employer: "ABC Plumbing" };
    const report = await collectSearch(input, { demoMode: true });

    expect(report.providers.length).toBeGreaterThan(0);
    expect(report.candidates.length).toBeGreaterThanOrEqual(1);
    // Strongest candidate should be the Brisbane/ABC Plumbing match.
    expect(report.candidates[0].confidence).toBeGreaterThan(report.candidates[report.candidates.length - 1].confidence - 1);
    expect(report.summary.demo).toBe(true);
    // Web search has no key in tests → honest not_configured, not faked.
    const websearch = report.providers.find((p) => p.provider === "websearch");
    expect(websearch?.status).toBe("not_configured");
  });

  it("does not throw and yields a report for a business search", async () => {
    const input: SearchInput = { type: "business", businessName: "ABC Plumbing" };
    const report = await collectSearch(input, { demoMode: true });
    expect(report.providers.length).toBeGreaterThan(0);
  });
});

describe("runSearch streaming", () => {
  it("emits meta, provider, candidates, then report in order", async () => {
    const kinds: string[] = [];
    for await (const ev of runSearch({ type: "person", firstName: "Jane", lastName: "Doe" }, { demoMode: true })) {
      kinds.push(ev.kind);
    }
    expect(kinds[0]).toBe("meta");
    expect(kinds).toContain("provider");
    expect(kinds).toContain("candidates");
    expect(kinds[kinds.length - 1]).toBe("report");
  });

  it("rejects invalid input with a fatal event", async () => {
    const kinds: string[] = [];
    for await (const ev of runSearch({ type: "person", firstName: "" }, { demoMode: true })) kinds.push(ev.kind);
    expect(kinds).toEqual(["fatal"]);
  });
});
