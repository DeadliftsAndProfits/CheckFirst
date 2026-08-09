/**
 * Discovery-link providers (real, no credentials).
 *
 * These never scrape behind authentication. They generate legitimate one-click
 * links into public search portals and official registers so the consumer can
 * open the authoritative source themselves. Everything here is "discovery".
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, ok, noResults } from "./base";
import { generateDiscoveryLinks, googleSearchUrl } from "@/lib/query/generator";

/** Social & general web discovery links. */
export const searchLinksProvider: Provider = {
  id: "searchlinks",
  label: "Public profiles & directories",
  category: "online",
  sourceClass: "discovery",
  appliesTo(ctx) {
    const n = ctx.normalised;
    return Boolean(n.fullName || n.businessName || n.username || n.email || n.phone || n.domain || n.website);
  },
  async run(ctx) {
    const links = generateDiscoveryLinks(ctx.input, ctx.normalised);
    const social = links.filter((l) => l.group === "social" || l.group === "search" || l.group === "directory");
    if (!social.length) return noResults(searchLinksProvider, "");
    const items: ResultItem[] = social.map((l) => ({
      title: l.label,
      detail: "Open this public search to look for matching profiles or listings.",
      sourceUrl: l.url,
      sourceClass: "discovery",
    }));
    return ok(searchLinksProvider, ctx.normalised.fullName ?? ctx.normalised.businessName ?? "", items, {
      sourceAuthority: "Generated public searches",
    });
  },
};

/** Court & tribunal discovery (AustLII), labelled as NOT a criminal-history check (§17). */
export const courtsProvider: Provider = {
  id: "courts",
  label: "Published court & tribunal mentions",
  category: "public_records",
  sourceClass: "discovery",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.fullName || ctx.normalised.businessName);
  },
  async run(ctx) {
    const who = ctx.normalised.fullName || ctx.normalised.businessName!;
    const items: ResultItem[] = [
      {
        title: "Search AustLII (courts & tribunals)",
        detail:
          "Publicly indexed judgments and tribunal decisions. This is NOT a criminal-history check and does not prove the absence of any record.",
        sourceUrl: `https://www.austlii.edu.au/cgi-bin/sinosrch.cgi?query=${encodeURIComponent(who)}`,
        sourceClass: "discovery",
      },
      {
        title: "Search Federal Court / court listings",
        detail: "Open a web search across Australian court and tribunal websites.",
        sourceUrl: googleSearchUrl(`"${who}" (site:austlii.edu.au OR site:fedcourt.gov.au OR site:aat.gov.au)`),
        sourceClass: "discovery",
      },
    ];
    return ok(courtsProvider, who, items, { sourceAuthority: "AustLII & court portals" });
  },
};

/** Trade-licence discovery (QBCC / NSW Fair Trading) — connector stubs (§14). */
export const licencesProvider: Provider = {
  id: "licences",
  label: "Trade & occupational licences",
  category: "licences",
  sourceClass: "discovery",
  appliesTo(ctx) {
    return ctx.input.type === "person" || ctx.input.type === "business";
  },
  async run(ctx) {
    const who = ctx.normalised.fullName || ctx.normalised.businessName || "";
    const state = ctx.normalised.state;
    const items: ResultItem[] = [];
    // Prioritise QLD then NSW per §14; always offer both plus a national search.
    if (!state || state === "QLD") {
      items.push({
        title: "QBCC licence search (QLD builders/trades)",
        detail: "Verify a Queensland building & construction licence directly with QBCC.",
        sourceUrl: "https://www.onlineservices.qbcc.qld.gov.au/OnlineLicenceSearch/",
        sourceClass: "discovery",
      });
    }
    if (!state || state === "NSW") {
      items.push({
        title: "NSW Fair Trading licence check",
        detail: "Verify a NSW trade licence (building, electrical, plumbing, etc.).",
        sourceUrl: "https://www.onegov.nsw.gov.au/publicregister/#/publicregister/search/Tradesperson",
        sourceClass: "discovery",
      });
    }
    items.push({
      title: "Search licence registers for this name",
      detail: "Open a web search across Australian licensing authorities.",
      sourceUrl: googleSearchUrl(`"${who}" licence (site:qbcc.qld.gov.au OR site:fairtrading.nsw.gov.au OR site:vba.vic.gov.au)`),
      sourceClass: "discovery",
    });
    return ok(licencesProvider, who, items, {
      sourceAuthority: "State licensing authorities",
      warnings: ["Live licence-register APIs are a planned integration; these links open the official registers."],
    });
  },
};

/** Professional & regulatory register discovery (Ahpra, ASIC, etc.) (§15,§16). */
export const professionalProvider: Provider = {
  id: "professional",
  label: "Professional & regulatory registers",
  category: "professional",
  sourceClass: "discovery",
  appliesTo(ctx) {
    return ctx.input.type === "person" || ctx.input.type === "business";
  },
  async run(ctx) {
    const who = ctx.normalised.fullName || ctx.normalised.businessName!;
    const items: ResultItem[] = [
      {
        title: "Ahpra register (health practitioners)",
        detail: "Verify registration & any conditions for doctors, nurses, and other health professionals.",
        sourceUrl: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx",
        sourceClass: "discovery",
      },
      {
        title: "ASIC published notices & professional registers",
        detail: "Financial services / credit licensees, banned & disqualified persons, insolvency notices.",
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`"${who}" (site:asic.gov.au OR site:download.asic.gov.au)`)}`,
        sourceClass: "discovery",
      },
      {
        title: "ACCC / Scamwatch & fair-trading warnings",
        detail: "Public regulator warnings and enforcement notices.",
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`"${who}" (site:accc.gov.au OR site:scamwatch.gov.au)`)}`,
        sourceClass: "discovery",
      },
    ];
    return ok(professionalProvider, who, items, { sourceAuthority: "Ahpra, ASIC, ACCC" });
  },
};
