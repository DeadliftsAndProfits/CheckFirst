/**
 * Email breach-STATUS provider (§10, config-gated) via Have I Been Pwned.
 *
 * Reports only the NAMES and dates of breaches an address appears in — never
 * passwords, credentials, or dumped data. Requires HIBP_API_KEY; without it we
 * return not_configured honestly.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, notConfigured, fetchWithTimeout } from "./base";
import { config } from "@/lib/config";

interface Breach {
  Name: string;
  Title: string;
  BreachDate: string;
  Domain: string;
  Description: string;
  DataClasses: string[];
}

export const hibpProvider: Provider = {
  id: "hibp",
  label: "Email breach status",
  category: "email",
  sourceClass: "authoritative",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.email);
  },
  async run(ctx: ProviderContext) {
    const email = ctx.normalised.email!;
    if (!config.hibp.configured) {
      return notConfigured(
        hibpProvider,
        email,
        "Breach-status needs a Have I Been Pwned API key (HIBP_API_KEY). Only breach names/dates are ever shown — never passwords.",
      );
    }
    try {
      const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;
      const res = await fetchWithTimeout(url, {
        timeoutMs: 8000,
        parentSignal: ctx.signal,
        headers: { "hibp-api-key": config.hibp.apiKey, Accept: "application/json" },
      });
      if (res.status === 404) {
        return buildResult({
          provider: hibpProvider,
          status: "no_results",
          query: email,
          warnings: ["No public breaches found for this address"],
        });
      }
      if (res.status === 401) {
        return buildResult({ provider: hibpProvider, status: "not_configured", query: email, warnings: ["HIBP API key rejected"] });
      }
      if (!res.ok) {
        return buildResult({ provider: hibpProvider, status: "unavailable", query: email, warnings: [`HIBP HTTP ${res.status}`] });
      }
      const breaches = (await res.json()) as Breach[];
      const items: ResultItem[] = breaches.slice(0, 20).map((b) => ({
        title: b.Title,
        detail: `Reported breach dated ${b.BreachDate}. Exposed data types: ${(b.DataClasses ?? []).join(", ")}.`,
        sourceClass: "authoritative",
        sourceUrl: `https://haveibeenpwned.com/PwnedwebsitesTitle`,
        fields: { Breach: b.Title, Date: b.BreachDate, "Data types": (b.DataClasses ?? []).join(", ") },
      }));
      return ok(hibpProvider, email, items, {
        sourceAuthority: "Have I Been Pwned",
        cacheSeconds: 6 * 3600,
        warnings: ["Breach status reflects third-party incidents, not this person's conduct"],
      });
    } catch (err) {
      return buildResult({
        provider: hibpProvider,
        status: "error",
        query: email,
        error: err instanceof Error ? err.message : "HIBP request failed",
      });
    }
  },
};
