/**
 * Website content provider (real, no credentials).
 *
 * Fetches the homepage (SSRF-guarded, size- and time-limited) and extracts the
 * page title, meta description, og:site_name, and any DISPLAYED ABN/ACN — the
 * business identity a site claims about itself. A displayed ABN is flagged for
 * cross-checking against the authoritative ABR (the `abn` provider).
 */
import type { ResultItem, EntitySignal } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fail, fetchWithTimeout } from "./base";
import { assertPublicHost } from "@/lib/security/ssrf";
import { normaliseAbn, normaliseAcn } from "@/lib/validation/abn";

const MAX_BYTES = 800_000;

function firstMatch(re: RegExp, html: string): string | undefined {
  const m = html.match(re);
  return m?.[1]?.trim();
}

function extractMeta(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const v = firstMatch(re, html);
    if (v) return v;
  }
  return undefined;
}

function findId(label: "ABN" | "ACN", digitsCount: number, html: string): string | undefined {
  const re = new RegExp(`${label}[:\\s]*((?:\\d[\\s]?){${digitsCount}})`, "i");
  const raw = firstMatch(re, html);
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  return digits.length === digitsCount ? digits : undefined;
}

export const webContentProvider: Provider = {
  id: "webcontent",
  label: "Website content & identity",
  category: "website",
  sourceClass: "discovery",
  dataOrigin: "live",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.origin || ctx.normalised.website || ctx.normalised.domain);
  },
  async run(ctx: ProviderContext) {
    const host = ctx.normalised.website || ctx.normalised.domain!;
    const origin = ctx.normalised.origin || `https://${host}`;

    const guard = await assertPublicHost(host);
    if (!guard.safe) {
      return buildResult({ provider: webContentProvider, status: "unavailable", query: origin, warnings: [`Skipped for safety: ${guard.reason}`] });
    }

    let html: string;
    try {
      const res = await fetchWithTimeout(origin, { timeoutMs: 9000, parentSignal: ctx.signal, redirect: "follow" });
      const ctype = res.headers.get("content-type") ?? "";
      if (!res.ok) return buildResult({ provider: webContentProvider, status: "unavailable", query: origin, warnings: [`HTTP ${res.status}`] });
      if (!/text\/html|application\/xhtml/i.test(ctype)) {
        return buildResult({ provider: webContentProvider, status: "no_results", query: origin, warnings: [`Not an HTML page (${ctype || "unknown"})`] });
      }
      const buf = await res.arrayBuffer();
      html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_BYTES));
    } catch (err) {
      return fail(webContentProvider, origin, err instanceof Error ? err.message : "Fetch failed");
    }

    const title = firstMatch(/<title[^>]*>([^<]*)<\/title>/i, html);
    const description = extractMeta(html, "description");
    const siteName = extractMeta(html, "og:site_name");

    const results: ResultItem[] = [];
    if (title || description || siteName) {
      results.push({
        title: title || siteName || host,
        detail: description || "Homepage retrieved.",
        sourceClass: "discovery",
        sourceUrl: origin,
        fields: {
          "Page title": title || "—",
          ...(siteName ? { "Site name": siteName } : {}),
          ...(description ? { Description: description.slice(0, 240) } : {}),
        },
      });
    }

    const abnDigits = findId("ABN", 11, html);
    const acnDigits = findId("ACN", 9, html);
    const abnValid = abnDigits ? normaliseAbn(abnDigits) : undefined;
    const acnValid = acnDigits ? normaliseAcn(acnDigits) : undefined;
    if (abnValid?.valid || acnValid?.valid) {
      const signals: EntitySignal[] = [];
      if (abnValid?.valid) signals.push({ kind: "abn", value: abnValid.abn! });
      if (acnValid?.valid) signals.push({ kind: "acn", value: acnValid.acn! });
      results.push({
        title: "Business identity displayed on the website",
        detail: "Shown by the site itself — verify against the authoritative ABR.",
        sourceClass: "discovery",
        sourceUrl: origin,
        fields: {
          ...(abnValid?.valid ? { "Displayed ABN": abnValid.display! } : {}),
          ...(acnValid?.valid ? { "Displayed ACN": acnValid.display! } : {}),
        },
        signals,
      });
    }

    if (!results.length) {
      return buildResult({ provider: webContentProvider, status: "no_results", query: origin, warnings: ["No title/description/identity found on the homepage"] });
    }
    return ok(webContentProvider, origin, results, { sourceUrl: origin, sourceAuthority: host, cacheSeconds: 3600 });
  },
};
