/**
 * Demo fixtures (§33).
 *
 * ONLY active when CHECKFIRST_DEMO_MODE=true (default in dev, off in prod).
 * Every item is flagged demo:true so the UI labels it "Demo data". Production
 * never silently substitutes these for real provider output.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, ok } from "./base";

const demo = true;

/** Demo identity provider — produces two candidates (a strong and a weak match). */
export const demoIdentityProvider: Provider = {
  id: "demo-identity",
  label: "Identity records (demo)",
  category: "identity",
  sourceClass: "discovery",
  dataOrigin: "demo",
  appliesTo(ctx) {
    return ctx.input.type === "person";
  },
  async run(ctx) {
    const first = ctx.normalised.firstName ?? "John";
    const last = ctx.normalised.lastName ?? "Smith";
    const items: ResultItem[] = [
      {
        title: `${first} Michael ${last}`,
        detail: "Brisbane QLD · associated with ABC Plumbing",
        sourceClass: "discovery",
        demo,
        fields: { Location: "Brisbane QLD", Employer: "ABC Plumbing", "Middle name": "Michael" },
        signals: [
          { kind: "name", value: `${first} ${last}` },
          { kind: "suburb", value: "Brisbane" },
          { kind: "state", value: "QLD" },
          { kind: "employer", value: "abc plumbing" },
          { kind: "business", value: "abc plumbing" },
          { kind: "phone", value: "+61712345678" },
        ],
      },
      {
        title: `${first} ${last}`,
        detail: "Sydney NSW · limited public information",
        sourceClass: "discovery",
        demo,
        fields: { Location: "Sydney NSW" },
        signals: [
          { kind: "name", value: `${first} ${last}` },
          { kind: "state", value: "NSW" },
        ],
      },
    ];
    return ok(demoIdentityProvider, `${first} ${last}`, items, { sourceAuthority: "Demo dataset" });
  },
};

/** Demo authoritative business record. */
export const demoBusinessProvider: Provider = {
  id: "demo-business",
  label: "Business register (demo)",
  category: "business",
  sourceClass: "authoritative",
  dataOrigin: "demo",
  appliesTo(ctx) {
    return ctx.input.type === "person" || ctx.input.type === "business";
  },
  async run(ctx) {
    const name = ctx.normalised.businessName ?? "ABC Plumbing Pty Ltd";
    const item: ResultItem = {
      title: name.toUpperCase(),
      detail: "Active · ABN registered · GST registered",
      sourceClass: "authoritative",
      demo,
      sourceUrl: "https://abr.business.gov.au/",
      fields: {
        ABN: "51 824 753 556",
        Status: "Active (from 2009-06-01)",
        Entity: "Australian Private Company",
        GST: "Registered from 2009-06-01",
        Location: "Brisbane QLD 4000",
      },
      signals: [
        { kind: "business", value: name.toLowerCase() },
        { kind: "abn", value: "51824753556" },
        { kind: "state", value: "QLD" },
        { kind: "postcode", value: "4000" },
        { kind: "suburb", value: "Brisbane" },
      ],
    };
    return ok(demoBusinessProvider, name, [item], { sourceAuthority: "Australian Business Register (demo)" });
  },
};

/** Demo trade-licence record. */
export const demoLicenceProvider: Provider = {
  id: "demo-licence",
  label: "Trade licence (demo)",
  category: "licences",
  sourceClass: "authoritative",
  dataOrigin: "demo",
  appliesTo(ctx) {
    return ctx.input.type === "person" || ctx.input.type === "business";
  },
  async run(ctx) {
    const item: ResultItem = {
      title: "QBCC Contractor Licence — Plumbing",
      detail: "Licence current · no suspensions recorded",
      sourceClass: "authoritative",
      demo,
      sourceUrl: "https://www.onlineservices.qbcc.qld.gov.au/OnlineLicenceSearch/",
      fields: {
        "Licence no.": "1234567",
        Class: "Plumbing & Drainage",
        Status: "Current",
        Issued: "2011-03-14",
        Expiry: "2026-03-14",
        Authority: "QBCC (QLD)",
      },
      signals: [
        { kind: "business", value: "abc plumbing" },
        { kind: "state", value: "QLD" },
      ],
    };
    return ok(demoLicenceProvider, ctx.normalised.fullName ?? "ABC Plumbing", [item], {
      sourceAuthority: "QBCC (demo)",
    });
  },
};

export const demoProviders: Provider[] = [demoIdentityProvider, demoBusinessProvider, demoLicenceProvider];
