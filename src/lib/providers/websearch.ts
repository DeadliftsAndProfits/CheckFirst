/**
 * Public web-search provider (§18) — now backed by the multi-provider router
 * (Brave → You.com → Tavily). This orchestrator-level Provider owns:
 *  - deciding the cache TTL for the search kind,
 *  - normalising router results into ResultItems (with provenance),
 *  - canonicalising + de-duplicating URLs,
 *  - reporting honest status + diagnostics.
 *
 * All routing, caching, fallback and concurrency live in src/lib/websearch/.
 * Raw results only — no LLM/answer endpoints (see engine implementations).
 */
import type { ResultItem, SearchType } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, notConfigured } from "./base";
import { config, webSearchConfigured } from "@/lib/config";
import { personSignals } from "@/lib/query/generator";
import { runWebSearch } from "@/lib/websearch/router";
import { engines } from "@/lib/websearch/registry";
import type { WebEngineId } from "@/lib/websearch/types";

/** Strip fragments and common tracking params so equivalent URLs de-dupe (§38). */
function canonicalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "mc_cid", "mc_eid", "ref"]) {
      url.searchParams.delete(p);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

function ttlFor(type: SearchType): number {
  return config.search.cacheTtlSeconds(type) * 1000;
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
    if (!webSearchConfigured()) {
      return notConfigured(
        webSearchProvider,
        query,
        "Web search needs a Brave (BRAVE_SEARCH_API_KEY), You.com (YOU_SEARCH_API_KEY) or Tavily (TAVILY_API_KEY) key. Discovery links below still work.",
      );
    }

    const outcome = await runWebSearch(ctx.queries, {
      signal: ctx.signal,
      ttlMs: ttlFor(ctx.input.type),
      count: 8,
    });

    // Normalise + de-duplicate by canonical URL (keep first / highest-ranked).
    const seen = new Set<string>();
    const items: ResultItem[] = [];
    for (const r of outcome.results) {
      const canon = canonicalizeUrl(r.url);
      if (seen.has(canon)) continue;
      seen.add(canon);
      items.push({
        title: r.title,
        detail: r.snippet,
        sourceUrl: r.url,
        sourceClass: "discovery",
        fields: {
          Query: r.query,
          Source: engines[r.engine]?.name ?? r.engine,
          Retrieved: r.retrievedAt,
          Cache: r.cacheStatus === "hit" ? "cached" : "live",
        },
      });
    }
    const trimmed = items.slice(0, 18);

    // §12 diagnostics: logical signals vs physical provider queries (Person).
    const diagnostics: Record<string, unknown> = { web: outcome.metrics };
    if (ctx.input.type === "person") {
      const plan = personSignals(ctx.normalised);
      diagnostics.plan = {
        logicalSignals: plan.length,
        physicalQueries: plan.reduce((a, s) => a + s.queries.length, 0),
        signals: plan.map((s) => ({ kind: s.kind, label: s.label, queries: s.queries.length })),
      };
    }
    const authority = outcome.metrics.enginesUsed.map((id: WebEngineId) => engines[id]?.name ?? id).join(" → ") || (outcome.metrics.selectedWebProvider ?? "Web search");

    if (!trimmed.length) {
      const res = buildResult({
        provider: webSearchProvider,
        status: outcome.status === "unavailable" ? "unavailable" : "no_results",
        query,
        warnings: outcome.warnings,
      });
      res.diagnostics = diagnostics;
      return res;
    }

    const res = ok(webSearchProvider, query, trimmed, {
      sourceAuthority: authority,
      cacheSeconds: 1800,
      warnings: outcome.warnings,
    });
    // Honesty axis: if nothing hit the network, this was served from cache.
    if (outcome.metrics.webApiCallsConsumed === 0) res.dataOrigin = "cached";
    res.diagnostics = diagnostics;
    return res;
  },
};
