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

// Module-level cache: avoid re-hitting the paid/limited API for the same query
// (e.g. when a user re-runs or edits a search). Lives for the server's lifetime.
const CACHE_TTL_MS = 15 * 60 * 1000;
const queryCache = new Map<string, { at: number; hits: Hit[] }>();

/** Search engines return snippets with <strong> highlights and HTML entities. */
function clean(s: string): string {
  const out = (s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Search engines return this placeholder for pages (e.g. LinkedIn) that block
  // snippet text — it's noise, not a description.
  if (/^we cannot provide a description for this page/i.test(out)) return "";
  return out;
}

async function googleSearch(query: string, signal: AbortSignal): Promise<Hit[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${config.google.apiKey}&cx=${config.google.cx}&num=5&q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, { timeoutMs: 8000, parentSignal: signal });
  if (!res.ok) throw new Error(`Google CSE HTTP ${res.status}`);
  const data = (await res.json()) as { items?: { title: string; link: string; snippet: string }[] };
  return (data.items ?? []).map((i) => ({ title: clean(i.title), link: i.link, snippet: clean(i.snippet) }));
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
  return (data.webPages?.value ?? []).map((i) => ({ title: clean(i.name), link: i.url, snippet: clean(i.snippet) }));
}

async function braveSearch(query: string, signal: AbortSignal): Promise<Hit[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?count=8&q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, {
    timeoutMs: 8000,
    parentSignal: signal,
    headers: { "X-Subscription-Token": config.brave.apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data = (await res.json()) as { web?: { results?: { title: string; url: string; description?: string }[] } };
  return (data.web?.results ?? []).map((i) => ({ title: clean(i.title), link: i.url, snippet: clean(i.description ?? "") }));
}

export const webSearchProvider: Provider = {
  id: "websearch",
  label: "Public web search",
  category: "web",
  sourceClass: "discovery",
  dataOrigin: "live",
  appliesTo(ctx) {
    return ctx.queries.length > 0;
  },
  async run(ctx: ProviderContext) {
    const query = ctx.queries[0] ?? "";
    const engine = config.brave.configured ? "brave" : config.google.configured ? "google" : config.bing.configured ? "bing" : null;
    if (!engine) {
      return notConfigured(
        webSearchProvider,
        query,
        "Web search needs a Brave Search key (BRAVE_SEARCH_API_KEY) or a Google Programmable Search key (GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX). Discovery links below still work.",
      );
    }

    const runQueries = ctx.queries.slice(0, 4);
    const seen = new Set<string>();
    const results: ResultItem[] = [];
    const warnings: string[] = [];

    let networkCalls = 0;
    for (let idx = 0; idx < runQueries.length; idx++) {
      const q = runQueries[idx];
      const cacheKey = `${engine}|${q}`;
      const cached = queryCache.get(cacheKey);
      try {
        let hits: Hit[];
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          hits = cached.hits; // served from cache — no API call, no credit spent
        } else {
          // Brave's free tier allows ~1 request/second — space real calls to avoid 429s.
          if (engine === "brave" && networkCalls > 0) await new Promise((r) => setTimeout(r, 1100));
          networkCalls++;
          hits = engine === "brave" ? await braveSearch(q, ctx.signal) : engine === "google" ? await googleSearch(q, ctx.signal) : await bingSearch(q, ctx.signal);
          queryCache.set(cacheKey, { at: Date.now(), hits });
        }
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
    return ok(webSearchProvider, query, results.slice(0, 18), {
      sourceAuthority: engine === "brave" ? "Brave Search" : engine === "google" ? "Google Programmable Search" : "Bing Web Search",
      cacheSeconds: 1800,
      warnings,
    });
  },
};
