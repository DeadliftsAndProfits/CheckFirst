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
  dataOrigin: "live",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.email);
  },
  async run(ctx: ProviderContext) {
    const emails = (ctx.normalised.emails ?? ctx.normalised.email ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    const query = emails.join(", ");
    if (!config.hibp.configured) {
      return notConfigured(
        hibpProvider,
        query,
        "Breach-status needs a Have I Been Pwned API key (HIBP_API_KEY). Only breach names/dates are ever shown — never passwords.",
      );
    }

    const items: ResultItem[] = [];
    const warnings: string[] = [];
    let sawError = false;
    try {
      for (const email of emails) {
        const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;
        const res = await fetchWithTimeout(url, {
          timeoutMs: 8000,
          parentSignal: ctx.signal,
          headers: { "hibp-api-key": config.hibp.apiKey, Accept: "application/json" },
        });
        if (res.status === 404) continue; // no breaches for this address
        if (res.status === 401) {
          return buildResult({ provider: hibpProvider, status: "not_configured", query, warnings: ["HIBP API key rejected"] });
        }
        if (!res.ok) {
          warnings.push(`${email}: HIBP HTTP ${res.status}`);
          sawError = true;
          continue;
        }
        const breaches = (await res.json()) as Breach[];
        for (const b of breaches.slice(0, 20)) {
          items.push({
            title: b.Title,
            detail: `${emails.length > 1 ? email + " — " : ""}reported breach dated ${b.BreachDate}. Exposed data types: ${(b.DataClasses ?? []).join(", ")}.`,
            sourceClass: "authoritative",
            sourceUrl: "https://haveibeenpwned.com/",
            fields: { Address: email, Breach: b.Title, Date: b.BreachDate, "Data types": (b.DataClasses ?? []).join(", ") },
          });
        }
      }
    } catch (err) {
      return buildResult({ provider: hibpProvider, status: "error", query, error: err instanceof Error ? err.message : "HIBP request failed" });
    }

    if (!items.length) {
      return buildResult({
        provider: hibpProvider,
        status: sawError ? "unavailable" : "no_results",
        query,
        warnings: sawError ? warnings : ["No public breaches found for the supplied address(es)"],
      });
    }
    return ok(hibpProvider, query, items, {
      sourceAuthority: "Have I Been Pwned",
      cacheSeconds: 6 * 3600,
      warnings: ["Breach status reflects third-party incidents, not this person's conduct", ...warnings],
    });
  },
};
