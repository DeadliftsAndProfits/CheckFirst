/**
 * Domain registration / age provider (real, no credentials) via RDAP.
 *
 * RDAP is the successor to WHOIS and is served as JSON. rdap.org bootstraps to
 * the authoritative registry. We extract registration/expiry dates and status.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fetchWithTimeout } from "./base";

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}
interface RdapResponse {
  events?: RdapEvent[];
  status?: string[];
  entities?: unknown[];
  ldhName?: string;
}

function ageString(from: Date): string {
  const days = Math.floor((Date.now() - from.getTime()) / 86_400_000);
  if (days < 0) return "future date";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years} year${years > 1 ? "s" : ""}${months ? `, ${months} mo` : ""}`;
  if (months > 0) return `${months} month${months > 1 ? "s" : ""}`;
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export const rdapProvider: Provider = {
  id: "rdap",
  label: "Domain registration (RDAP)",
  category: "website",
  sourceClass: "authoritative",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.domain || ctx.normalised.website);
  },
  async run(ctx: ProviderContext) {
    const domain = ctx.normalised.domain || ctx.normalised.website!;
    const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    let data: RdapResponse;
    try {
      const res = await fetchWithTimeout(url, {
        timeoutMs: 8000,
        parentSignal: ctx.signal,
        headers: { Accept: "application/rdap+json" },
      });
      if (res.status === 404) {
        return buildResult({
          provider: rdapProvider,
          status: "no_results",
          query: domain,
          warnings: ["No registration record found (domain may be unregistered or ccTLD without RDAP)"],
        });
      }
      if (!res.ok) {
        return buildResult({ provider: rdapProvider, status: "unavailable", query: domain, warnings: [`RDAP HTTP ${res.status}`] });
      }
      data = (await res.json()) as RdapResponse;
    } catch (err) {
      return buildResult({
        provider: rdapProvider,
        status: "unavailable",
        query: domain,
        warnings: [err instanceof Error ? err.message : "RDAP unavailable"],
      });
    }

    const reg = data.events?.find((e) => e.eventAction === "registration");
    const exp = data.events?.find((e) => e.eventAction === "expiration");
    const changed = data.events?.find((e) => e.eventAction === "last changed");
    const fields: Record<string, string> = {};
    if (reg) {
      const d = new Date(reg.eventDate);
      fields["Registered"] = `${d.toISOString().slice(0, 10)} (${ageString(d)} ago)`;
    }
    if (exp) fields["Expires"] = new Date(exp.eventDate).toISOString().slice(0, 10);
    if (changed) fields["Last changed"] = new Date(changed.eventDate).toISOString().slice(0, 10);
    if (data.status?.length) fields["Status"] = data.status.join(", ");

    if (!Object.keys(fields).length) {
      return buildResult({ provider: rdapProvider, status: "no_results", query: domain });
    }

    const warnings: string[] = [];
    if (reg) {
      const ageDays = (Date.now() - new Date(reg.eventDate).getTime()) / 86_400_000;
      if (ageDays < 90) warnings.push("Domain registered less than 90 days ago — newer domains warrant extra caution");
    }

    const item: ResultItem = {
      title: "Domain registration",
      detail: fields["Registered"] ?? "Registration details",
      sourceClass: "authoritative",
      sourceUrl: `https://rdap.org/domain/${domain}`,
      fields,
    };
    return ok(rdapProvider, domain, [item], {
      sourceUrl: `https://rdap.org/domain/${domain}`,
      sourceAuthority: "RDAP registry",
      cacheSeconds: 12 * 3600,
      warnings,
    });
  },
};
