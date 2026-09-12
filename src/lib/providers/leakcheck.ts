/**
 * Email breach-STATUS provider via LeakCheck's PUBLIC API (§10) — FREE, no key.
 *
 * The public endpoint (https://leakcheck.io/api/public) reports, for an address:
 *  - how many known breaches it appears in,
 *  - the SOURCE names and dates of those breaches,
 *  - the DATA TYPES exposed across them (field names only, e.g. "password",
 *    "phone") — never the actual leaked values.
 *
 * We surface only that metadata, consistent with our HIBP/XposedOrNot providers.
 * The public tier reliably covers email/username; phone lookups are a paid tier,
 * so this provider applies to email only.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fetchWithTimeout } from "./base";

interface PublicResponse {
  success: boolean;
  error?: string;
  found?: number;
  fields?: string[];
  sources?: { name: string; date?: string }[];
}

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function splitEmails(ctx: ProviderContext): string[] {
  return (ctx.normalised.emails ?? ctx.normalised.email ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export const leakCheckProvider: Provider = {
  id: "leakcheck",
  label: "Email breach status (LeakCheck)",
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
        const url = `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`;
        const res = await fetchWithTimeout(url, { timeoutMs: 8000, parentSignal: ctx.signal, headers: { Accept: "application/json" } });
        if (!res.ok) {
          warnings.push(`${email}: LeakCheck HTTP ${res.status}`);
          sawError = true;
          continue;
        }
        const data = (await res.json()) as PublicResponse;
        if (!data.success || !data.found) continue; // "Not found" — address is clean in this index

        const prefix = emails.length > 1 ? `${email} — ` : "";
        const types = (data.fields ?? []).map(titleCase);
        // Lead summary: appearance count + exposed data TYPES (names, never values).
        items.push({
          title: `${prefix}Appears in ${data.found} known data breach${data.found === 1 ? "" : "es"}`,
          detail: types.length ? `Exposed data types across these breaches: ${types.join(", ")}.` : "Reported by the LeakCheck breach index.",
          sourceClass: "authoritative",
          sourceUrl: "https://leakcheck.io/",
          fields: {
            Address: email,
            "Breach appearances": String(data.found),
            ...(types.length ? { "Data types": types.join(", ") } : {}),
          },
        });
        // Named sources (cap to keep the report readable).
        for (const s of (data.sources ?? []).slice(0, 20)) {
          items.push({
            title: s.name,
            detail: `${prefix}${s.date ? `reported ${s.date}. ` : ""}Listed in the LeakCheck breach index.`.trim(),
            sourceClass: "authoritative",
            sourceUrl: "https://leakcheck.io/",
            fields: { Address: email, Breach: s.name, ...(s.date ? { Date: s.date } : {}) },
          });
        }
      }
    } catch (err) {
      return buildResult({ provider: leakCheckProvider, status: "error", query, error: err instanceof Error ? err.message : "LeakCheck request failed" });
    }

    if (!items.length) {
      return buildResult({
        provider: leakCheckProvider,
        status: sawError ? "unavailable" : "no_results",
        query,
        warnings: sawError ? warnings : ["No public breaches found for the supplied address(es)"],
      });
    }
    return ok(leakCheckProvider, query, items, {
      sourceAuthority: "LeakCheck (public)",
      cacheSeconds: 6 * 3600,
      warnings: ["Breach status reflects third-party incidents, not this person's conduct", ...warnings],
    });
  },
};
