import { describe, it, expect } from "vitest";
import { collectSearch } from "@/lib/orchestrator";
import type { SearchInput } from "@/types/core";

describe("R3 search integrity", () => {
  it("a default (demo OFF) person search contains NO demo/fixture data", async () => {
    const input: SearchInput = { type: "person", firstName: "John", lastName: "Smith", suburb: "Brisbane", state: "QLD" };
    const report = await collectSearch(input, { demoMode: false });
    expect(report.summary.demo).toBe(false);
    expect(report.providers.some((p) => p.dataOrigin === "demo")).toBe(false);
    expect(report.providers.some((p) => p.results.some((r) => r.demo))).toBe(false);
    // Candidates in a default person search must not come from fixtures.
    expect(report.candidates.every((c) => !c.demo)).toBe(true);
  });

  it("link-generators are classified as links, not counted as searched sources", async () => {
    const report = await collectSearch({ type: "business", businessName: "Telstra" }, { demoMode: false });
    const links = report.providers.filter((p) => p.dataOrigin === "link");
    expect(links.length).toBeGreaterThan(0);
    // Business w/o ABR key & no website → no real query providers ran.
    expect(report.summary.sourcesSearched).toBe(0);
    expect(report.summary.links).toBeGreaterThan(0);
    // not_configured is surfaced honestly (ABN, web search).
    expect(report.summary.needsConfig).toBeGreaterThan(0);
  });

  it("demo data only appears when demo mode is explicitly on", async () => {
    const on = await collectSearch({ type: "person", firstName: "Jane", lastName: "Doe" }, { demoMode: true });
    expect(on.summary.demo).toBe(true);
    expect(on.providers.some((p) => p.dataOrigin === "demo")).toBe(true);
  });
});
