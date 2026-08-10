/**
 * Certificate Transparency provider (real, no credentials) via crt.sh.
 *
 * CT logs are public and reveal subdomains / historical certificates for a
 * domain — useful for understanding an organisation's real web footprint.
 * Classified as "discovery".
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fetchWithTimeout } from "./base";

interface CrtRow {
  name_value: string;
  issuer_name: string;
  not_before: string;
}

export const ctProvider: Provider = {
  id: "ct",
  label: "Certificate Transparency (crt.sh)",
  category: "website",
  sourceClass: "discovery",
  dataOrigin: "live",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.domain || ctx.normalised.website);
  },
  async run(ctx: ProviderContext) {
    const domain = ctx.normalised.domain || ctx.normalised.website!;
    const url = `https://crt.sh/?q=${encodeURIComponent("%." + domain)}&output=json`;
    let rows: CrtRow[];
    try {
      const res = await fetchWithTimeout(url, { timeoutMs: 9000, parentSignal: ctx.signal });
      if (!res.ok) {
        return buildResult({
          provider: ctProvider,
          status: "unavailable",
          query: domain,
          warnings: [`crt.sh returned HTTP ${res.status}`],
        });
      }
      rows = (await res.json()) as CrtRow[];
    } catch (err) {
      return buildResult({
        provider: ctProvider,
        status: "unavailable",
        query: domain,
        warnings: [err instanceof Error ? err.message : "crt.sh unavailable"],
      });
    }

    const subdomains = new Set<string>();
    for (const r of rows) {
      for (const name of r.name_value.split("\n")) {
        const host = name.trim().toLowerCase();
        if (host && !host.startsWith("*") && host.endsWith(domain)) subdomains.add(host);
      }
    }
    const list = [...subdomains].sort();
    if (!list.length) {
      return buildResult({ provider: ctProvider, status: "no_results", query: domain });
    }

    const item: ResultItem = {
      title: `${list.length} host name(s) in Certificate Transparency logs`,
      detail: list.slice(0, 20).join(", ") + (list.length > 20 ? ` … (+${list.length - 20} more)` : ""),
      sourceClass: "discovery",
      sourceUrl: `https://crt.sh/?q=${encodeURIComponent("%." + domain)}`,
    };
    return ok(ctProvider, domain, [item], {
      sourceUrl: `https://crt.sh/?q=${encodeURIComponent("%." + domain)}`,
      sourceAuthority: "crt.sh (Certificate Transparency)",
      cacheSeconds: 6 * 3600,
    });
  },
};
