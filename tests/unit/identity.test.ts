import { describe, it, expect } from "vitest";
import { buildIdentity } from "@/lib/identity";
import type { ProviderResult, ResultItem, SearchInput } from "@/types/core";

const PERSON = { type: "person" } as SearchInput;

function web(results: Array<Partial<ResultItem> & { title: string }>): ProviderResult {
  return {
    provider: "websearch",
    providerLabel: "Public web search",
    category: "web",
    status: "complete",
    query: "",
    timestamp: new Date().toISOString(),
    results: results.map((r) => ({ sourceClass: "discovery", ...r })) as ResultItem[],
    sourceClass: "discovery",
    dataOrigin: "live",
    warnings: [],
  };
}

const sam = { fullName: "Sam Magee", firstName: "Sam", lastName: "Magee", employer: "Panthera Finance", state: "QLD" };

describe("identity matcher V2 — candidate-level correlation", () => {
  it("correlates: LinkedIn found by the location query + employer corroborated by a separate result's snippet", () => {
    const out = buildIdentity(PERSON, sam, [
      web([
        {
          title: "Sam Magee - Leadership | LinkedIn",
          detail: "Leadership across a range of industries",
          sourceUrl: "https://au.linkedin.com/in/sam-magee-6656942b",
          fields: { Query: '"Sam Magee" QLD' }, // location query — no employer in it
        },
        {
          title: "Sam Magee at Panthera Finance",
          detail: "Sam Magee works at Panthera Finance",
          sourceUrl: "https://data-lead.example/p/sam",
          fields: { Query: '"Sam Magee" Panthera Finance' }, // employer corroboration from ANOTHER result
        },
      ]),
    ])!;
    expect(out.summary.bestProfile?.url).toBe("https://au.linkedin.com/in/sam-magee-6656942b");
    expect(out.summary.bestProfile?.platform).toBe("LinkedIn");
    expect(out.candidate.confidence).toBeGreaterThan(80);
    const employerField = out.summary.fields.find((f) => f.label === "Employer");
    expect(employerField?.verified).toBe(true); // corroborated across the investigation
    expect(out.summary.matchedRefs).toBeGreaterThanOrEqual(2);
  });

  it("canonicalises equivalent www./au. LinkedIn URLs to ONE candidate", () => {
    const out = buildIdentity(PERSON, sam, [
      web([
        { title: "Sam Magee | LinkedIn", sourceUrl: "https://au.linkedin.com/in/sam-magee-6656942b", fields: { Query: '"Sam Magee" QLD' } },
        {
          title: "Sam Magee - Analyst - Panthera Finance | LinkedIn",
          detail: "Sam Magee · Panthera Finance",
          sourceUrl: "https://www.linkedin.com/in/sam-magee-6656942b",
          fields: { Query: '"Sam Magee" Panthera Finance' },
        },
      ]),
    ])!;
    // Same slug across regional hosts → one profile, AU host preferred for display.
    expect(out.summary.bestProfile?.url).toBe("https://au.linkedin.com/in/sam-magee-6656942b");
    expect(out.summary.matchedRefs).toBe(2); // both instances of the SAME profile
    expect(out.summary.otherNameRefs).toBe(0);
    expect(out.summary.fields.find((f) => f.label === "Employer")?.verified).toBe(true);
  });

  it("does NOT strongly match a same-name stranger without corroboration", () => {
    const out = buildIdentity(PERSON, sam, [
      web([
        {
          title: "Sam Magee - Barrister | LinkedIn",
          detail: "London barrister",
          sourceUrl: "https://uk.linkedin.com/in/sam-magee-99999", // non-AU, no employer/location
          fields: { Query: '"Sam Magee"' },
        },
      ]),
    ])!;
    expect(out.summary.bestProfile).toBeUndefined();
    expect(out.candidate.confidence).toBeLessThanOrEqual(30);
    expect(out.summary.matchedRefs).toBe(0);
    expect(out.summary.otherNameRefs).toBeGreaterThanOrEqual(1);
  });

  it("employer disagreement lowers confidence vs a neutral profile", () => {
    const control = buildIdentity(PERSON, sam, [
      web([{ title: "Sam Magee | LinkedIn", sourceUrl: "https://au.linkedin.com/in/sam-magee-abc", fields: { Query: '"Sam Magee" QLD' } }]),
    ])!;
    const conflict = buildIdentity(PERSON, sam, [
      web([
        {
          title: "Sam Magee - Analyst - Rival Corp | LinkedIn",
          sourceUrl: "https://au.linkedin.com/in/sam-magee-abc",
          fields: { Query: '"Sam Magee" QLD' },
        },
      ]),
    ])!;
    expect(conflict.candidate.confidence).toBeLessThan(control.candidate.confidence);
    expect(conflict.candidate.evidence.some((e) => e.polarity === "conflict")).toBe(true);
  });

  it("a supplied value appearing ONLY in the query is NOT treated as corroborated", () => {
    // "Sam Magee" QLD returns his profile, but neither QLD nor Panthera appears in
    // any snippet → both must stay "as provided", with no confidence lift from them.
    const out = buildIdentity(PERSON, sam, [
      web([
        {
          title: "Sam Magee | LinkedIn",
          detail: "Leadership across a range of industries", // no QLD, no Panthera
          sourceUrl: "https://au.linkedin.com/in/sam-magee-6656942b",
          fields: { Query: '"Sam Magee" QLD' }, // location only in the QUERY
        },
      ]),
    ])!;
    expect(out.summary.bestProfile?.url).toBe("https://au.linkedin.com/in/sam-magee-6656942b"); // still surfaces
    const loc = out.summary.fields.find((f) => f.label === "Location");
    const emp = out.summary.fields.find((f) => f.label === "Employer");
    expect(loc?.note).toBe("as provided");
    expect(loc?.verified).toBeFalsy();
    expect(emp?.note).toBe("as provided");
    expect(emp?.verified).toBeFalsy();
    expect(out.candidate.evidence.some((e) => /via search/i.test(e.label))).toBe(false);
    expect(out.candidate.confidence).toBeLessThanOrEqual(55); // capped: no independent corroboration
  });

  it("name + AU profile only (no employer/location corroboration) stays a possible, not strong, match", () => {
    const out = buildIdentity(PERSON, { fullName: "Sam Magee", firstName: "Sam", lastName: "Magee" }, [
      web([{ title: "Sam Magee | LinkedIn", sourceUrl: "https://au.linkedin.com/in/sam-magee-6656942b", fields: { Query: '"Sam Magee" site:linkedin.com' } }]),
    ])!;
    expect(out.candidate.confidence).toBeLessThanOrEqual(55); // conservative cap (§5)
  });
});
