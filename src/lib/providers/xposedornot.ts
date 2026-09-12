/**
 * Email breach-STATUS provider via XposedOrNot (§10) — FREE, no API key.
 *
 * XposedOrNot is a public breach index (https://xposedornot.com). Its
 * breach-analytics endpoint reports the NAMES, dates, record counts and exposed
 * DATA TYPES for breaches an address appears in. Like our HIBP provider, we show
 * only breach metadata — never passwords, credentials, or dumped values.
 *
 * No key required, so this works on the free product for every user.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fetchWithTimeout } from "./base";

interface BreachDetail {
  breach: string;
  details?: string;
  domain?: string;
  industry?: string;
  xposed_data?: string; // semicolon-separated data types, e.g. "Email addresses;Passwords"
  xposed_date?: string;
  xposed_records?: number;
}
interface AnalyticsResponse {
  Error?: string;
  ExposedBreaches?: { breaches_details?: BreachDetail[] };
  BreachMetrics?: { risk?: { risk_label?: string; risk_score?: number }[] };
}

function splitEmails(ctx: ProviderContext): string[] {
  return (ctx.normalised.emails ?? ctx.normalised.email ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export const xposedOrNotProvider: Provider = {
  id: "xposedornot",
  label: "Email breach status (XposedOrNot)",
  category: "email",
  sourceClass: "authoritative",
  dataOrigin: "live",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.email);
  },
  async run(ctx: ProviderContext) {
    const emails = splitEmails(ctx);
    const query = emails.join(", ");

    const items: ResultItem[] = [];
    const warnings: string[] = [];
    let sawError = false;

    try {
      for (const email of emails) {
        const url = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`;
        const res = await fetchWithTimeout(url, { timeoutMs: 8000, parentSignal: ctx.signal, headers: { Accept: "application/json" } });
        // 404 / "Not found" simply means the address is clean in this index.
        if (res.status === 404) continue;
        if (!res.ok) {
          warnings.push(`${email}: XposedOrNot HTTP ${res.status}`);
          sawError = true;
          continue;
        }
        const data = (await res.json()) as AnalyticsResponse;
        const breaches = data.ExposedBreaches?.breaches_details ?? [];
        if (!breaches.length) continue; // clean, or `{Error:"Not found"}`

        for (const b of breaches.slice(0, 25)) {
          const types = (b.xposed_data ?? "").split(";").map((s) => s.trim()).filter(Boolean);
          const parts: string[] = [];
          if (emails.length > 1) parts.push(`${email} —`);
          if (b.xposed_date) parts.push(`reported ${b.xposed_date}.`);
          if (b.xposed_records) parts.push(`~${b.xposed_records.toLocaleString()} records.`);
          if (types.length) parts.push(`Exposed data types: ${types.join(", ")}.`);
          items.push({
            title: b.breach,
            detail: parts.join(" ").trim() || `Breach reported by XposedOrNot.`,
            sourceClass: "authoritative",
            sourceUrl: b.domain ? `https://${b.domain}` : "https://xposedornot.com/",
            fields: {
              Address: email,
              Breach: b.breach,
              ...(b.xposed_date ? { Date: b.xposed_date } : {}),
              ...(types.length ? { "Data types": types.join(", ") } : {}),
              ...(b.industry ? { Industry: b.industry } : {}),
            },
          });
        }
      }
    } catch (err) {
      return buildResult({ provider: xposedOrNotProvider, status: "error", query, error: err instanceof Error ? err.message : "XposedOrNot request failed" });
    }

    if (!items.length) {
      return buildResult({
        provider: xposedOrNotProvider,
        status: sawError ? "unavailable" : "no_results",
        query,
        warnings: sawError ? warnings : ["No public breaches found for the supplied address(es)"],
      });
    }
    return ok(xposedOrNotProvider, query, items, {
      sourceAuthority: "XposedOrNot",
      cacheSeconds: 6 * 3600,
      warnings: ["Breach status reflects third-party incidents, not this person's conduct", ...warnings],
    });
  },
};
