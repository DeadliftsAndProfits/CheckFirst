/**
 * Public web search provider (§18, config-gated).
 *
 * Uses Google Programmable Search (CSE) if configured, else Bing Web Search,
 * else returns not_configured. We run the top generated queries and de-duplicate
 * results. This is "discovery" — pointers, not authoritative facts.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, notConfigured, fetchWithTimeout } from "./base";
import { config } from "@/lib/config";

interface Hit {
  title: string;
  link: string;
  snippet: string;
}

async function googleSearch(query: string, signal: AbortSignal): Promise<Hit[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${config.google.apiKey}&cx=${config.google.cx}&num=5&q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, { timeoutMs: 8000, parentSignal: signal });
  if (!res.ok) throw new Error(`Google CSE HTTP ${res.status}`);
  const data = (await res.json()) as { items?: { title: string; link: string; snippet: string }[] };
  return (data.items ?? []).map((i) => ({ title: i.title, link: i.link, snippet: i.snippet }));
}

async function bingSearch(query: string, signal: AbortSignal): Promise<Hit[]> {
  const url = `https://api.bing.microsoft.com/v7.0/search?count=5&q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, {
    timeoutMs: 8000,
    parentSignal: signal,
    headers: { "Ocp-Apim-Subscription-Key": config.bing.apiKey },
  });
  if (!res.ok) throw new Error(`Bing HTTP ${res.status}`);
  const data = (await res.json()) as { webPages?: { value?: { name: string; url: string; snippet: string }[] } };
  return (data.webPages?.value ?? []).map((i) => ({ title: i.name, link: i.url, snippet: i.snippet }));
}

export const webSearchProvider: Provider = {
  id: "websearch",
  label: "Public web search",
  category: "web",
  sourceClass: "discovery",
  appliesTo(ctx) {
    return ctx.queries.length > 0;
  },
  async run(ctx: ProviderContext) {
    const query = ctx.queries[0] ?? "";
    const engine = config.google.configured ? "google" : config.bing.configured ? "bing" : null;
    if (!engine) {
      return notConfigured(
        webSearchProvider,
        query,
        "Web search needs a Google Programmable Search key (GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX) or a Bing key (BING_SEARCH_API_KEY). Discovery links below still work.",
      );
    }

    const runQueries = ctx.queries.slice(0, 3);
    const seen = new Set<string>();
    const results: ResultItem[] = [];
    const warnings: string[] = [];

    for (const q of runQueries) {
      try {
        const hits = engine === "google" ? await googleSearch(q, ctx.signal) : await bingSearch(q, ctx.signal);
        for (const h of hits) {
          if (seen.has(h.link)) continue;
          seen.add(h.link);
          results.push({
            title: h.title,
            detail: h.snippet,
            sourceUrl: h.link,
            sourceClass: "discovery",
            fields: { Query: q },
          });
        }
      } catch (err) {
        warnings.push(err instanceof Error ? err.message : "A web-search query failed");
      }
    }

    if (!results.length) {
      return buildResult({ provider: webSearchProvider, status: warnings.length ? "unavailable" : "no_results", query, warnings });
    }
    return ok(webSearchProvider, query, results.slice(0, 15), {
      sourceAuthority: engine === "google" ? "Google Programmable Search" : "Bing Web Search",
      cacheSeconds: 1800,
      warnings,
    });
  },
};
