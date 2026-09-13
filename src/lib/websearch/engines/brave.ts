/**
 * Brave Search engine — RAW web results (milestone §44).
 * GET https://api.search.brave.com/res/v1/web/search  (header: X-Subscription-Token)
 */
import { fetchWithTimeout } from "@/lib/providers/base";
import { config } from "@/lib/config";
import { clean } from "../clean";
import { makeResponse, classifyError, classifyHttp } from "../engineUtil";
import type { WebEngine, SearchRequest, WebResult } from "../types";

interface BraveResult {
  title: string;
  url: string;
  description?: string;
  age?: string;
  page_age?: string;
}

export const braveEngine: WebEngine = {
  id: "brave",
  name: "Brave Search",
  maxConcurrency: 1, // free tier is ~1 request/second
  minIntervalMs: 1100,
  isConfigured() {
    return config.brave.configured;
  },
  isEnabled() {
    return config.search.enabled("brave");
  },
  async search(req: SearchRequest) {
    const started = Date.now();
    if (!this.isConfigured()) return makeResponse("brave", "not_configured", started);
    try {
      const params = new URLSearchParams({ q: req.query, count: String(req.count ?? 8) });
      if (req.country) params.set("country", req.country);
      if (req.freshness) params.set("freshness", req.freshness);
      const res = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        timeoutMs: 8000,
        parentSignal: req.signal,
        headers: { "X-Subscription-Token": config.brave.apiKey, Accept: "application/json" },
      });
      const bad = classifyHttp(res.status);
      if (bad) return makeResponse("brave", bad, started, [], `Brave HTTP ${res.status}`);
      const data = (await res.json()) as { web?: { results?: BraveResult[] } };
      const results: WebResult[] = (data.web?.results ?? []).map((r) => ({
        title: clean(r.title),
        url: r.url,
        snippet: clean(r.description ?? ""),
        publishedAt: r.page_age ?? r.age,
        source: "brave",
      }));
      return makeResponse("brave", results.length ? "success" : "no_results", started, results);
    } catch (err) {
      const { status, error } = classifyError(err);
      return makeResponse("brave", status, started, [], error);
    }
  },
};
