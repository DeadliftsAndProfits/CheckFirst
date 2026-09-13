import { describe, it, expect } from "vitest";
import { generateQueries, personSignals } from "@/lib/query/generator";
import { validateAndNormalise } from "@/lib/validation";
import type { SearchInput } from "@/types/core";

/** Helper: normalised queries for a Person input. */
function q(input: Partial<SearchInput>): string[] {
  const full: SearchInput = { type: "person", ...input };
  const { normalised } = validateAndNormalise(full);
  return generateQueries(full, normalised);
}
function kinds(input: Partial<SearchInput>): string[] {
  const full: SearchInput = { type: "person", ...input };
  const { normalised } = validateAndNormalise(full);
  return personSignals(normalised).map((s) => s.kind);
}

describe("Person web sub-query strategy V2 (§1–§7)", () => {
  it("name only → LinkedIn + bare name, no employer/location", () => {
    const qs = q({ firstName: "Alex", lastName: "Taylor" });
    expect(qs).toContain('"Alex Taylor" site:linkedin.com');
    expect(qs).toContain('"Alex Taylor"');
    expect(kinds({ firstName: "Alex", lastName: "Taylor" })).toEqual(["linkedin", "name"]);
  });

  it("name + state → location query + linkedin with location, NO bare name", () => {
    const input = { firstName: "Alex", lastName: "Taylor", state: "QLD" };
    const qs = q(input);
    expect(qs).toContain('"Alex Taylor" QLD');
    expect(qs).toContain('"Alex Taylor" QLD site:linkedin.com');
    expect(qs).not.toContain('"Alex Taylor"'); // bare-name suppressed (§4)
    expect(kinds(input)).toEqual(["location", "linkedin"]);
  });

  it("name + suburb + state → combined location query", () => {
    const qs = q({ firstName: "Alex", lastName: "Taylor", suburb: "Brisbane", state: "QLD" });
    expect(qs).toContain('"Alex Taylor" Brisbane QLD');
    expect(qs).toContain('"Alex Taylor" Brisbane QLD site:linkedin.com');
    expect(qs).not.toContain('"Alex Taylor"');
  });

  it("name + employer → single quoted employer query + linkedin, no duplicate forms", () => {
    const input = { firstName: "Alex", lastName: "Taylor", employer: "Acme Finance" };
    const qs = q(input);
    expect(qs).toContain('"Alex Taylor" "Acme Finance"');
    expect(qs).toContain('"Alex Taylor" "Acme Finance" site:linkedin.com');
    // §1/§14: the old weaker duplicate forms are gone.
    expect(qs).not.toContain("Alex Taylor Acme Finance");
    expect(qs).not.toContain("Alex Taylor Acme Finance linkedin");
    expect(qs).not.toContain('"Alex Taylor"'); // bare-name suppressed
  });

  it("name + employer + state → employer(+state), location, linkedin(employer)", () => {
    const input = { firstName: "Alex", lastName: "Taylor", employer: "Acme Finance", state: "QLD" };
    const qs = q(input);
    expect(qs).toContain('"Alex Taylor" "Acme Finance" QLD');
    expect(qs).toContain('"Alex Taylor" QLD');
    expect(qs).toContain('"Alex Taylor" "Acme Finance" site:linkedin.com');
    expect(kinds(input)).toEqual(["employer", "location", "linkedin"]);
  });

  it("LinkedIn context prioritisation: employer > location > name", () => {
    const emp = personSignals(validateAndNormalise({ type: "person", firstName: "A", lastName: "B", employer: "Acme", suburb: "Perth", state: "WA" }).normalised)
      .find((s) => s.kind === "linkedin")!;
    expect(emp.queries[0]).toBe('"A B" "Acme" site:linkedin.com');
    const locOnly = personSignals(validateAndNormalise({ type: "person", firstName: "A", lastName: "B", suburb: "Perth", state: "WA" }).normalised)
      .find((s) => s.kind === "linkedin")!;
    expect(locOnly.queries[0]).toBe('"A B" Perth WA site:linkedin.com');
    const nameOnly = personSignals(validateAndNormalise({ type: "person", firstName: "A", lastName: "B" }).normalised)
      .find((s) => s.kind === "linkedin")!;
    expect(nameOnly.queries[0]).toBe('"A B" site:linkedin.com');
  });

  it("email → exact address only, NO derived local-part search", () => {
    const qs = q({ firstName: "Alex", lastName: "Taylor", email: "alex@example.com" });
    expect(qs).toContain('"alex@example.com"');
    expect(qs).not.toContain('"alex"'); // §5: no handle search
  });

  it("username → exact username search (new in V2)", () => {
    const qs = q({ firstName: "Alex", lastName: "Taylor", username: "alextaylor77" });
    expect(qs).toContain('"alextaylor77"');
  });

  it("Australian mobile → three exact representations as SEPARATE queries (no Boolean OR)", () => {
    const input = { firstName: "Alex", lastName: "Taylor", phone: "0412 345 678" };
    const qs = q(input);
    expect(qs).toContain('"0412345678"');
    expect(qs).toContain('"0412 345 678"');
    expect(qs).toContain('"+61412345678"');
    // §9 empirical finding: never emit a Boolean OR for phone.
    expect(qs.some((s) => s.includes(" OR "))).toBe(false);
    const phoneSig = personSignals(validateAndNormalise({ type: "person", ...input }).normalised).find((s) => s.kind === "phone")!;
    expect(phoneSig.queries).toHaveLength(3); // one logical signal → three physical queries
  });

  it("rich person search matches the §10 logical plan", () => {
    const input = {
      firstName: "Alex",
      lastName: "Taylor",
      employer: "Acme Finance",
      suburb: "Brisbane",
      state: "QLD",
      email: "alex@example.com",
      phone: "0412 345 678",
      username: "alextaylor77",
    };
    const qs = q(input);
    expect(qs).toContain('"Alex Taylor" "Acme Finance" QLD');
    expect(qs).toContain('"Alex Taylor" Brisbane QLD');
    expect(qs).toContain('"Alex Taylor" "Acme Finance" site:linkedin.com');
    expect(qs).toContain('"alex@example.com"');
    expect(qs).toContain('"alextaylor77"');
    expect(qs).toContain('"0412345678"');
    // bare name suppressed; no duplicate employer forms
    expect(qs).not.toContain('"Alex Taylor"');
    expect(qs).not.toContain("Alex Taylor Acme Finance linkedin");
    // logical signals: employer, location, linkedin, email, username, phone = 6
    expect(kinds(input)).toEqual(["employer", "location", "linkedin", "email", "username", "phone"]);
  });
});
