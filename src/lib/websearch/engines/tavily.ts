/**
 * Tavily Search engine — BASIC/raw mode only (milestone §46).
 * POST https://api.tavily.com/search  (header: Authorization: Bearer)
 *
 * search_depth: "basic", include_answer: false, include_raw_content: false
 * → cheapest 1-credit call, raw results, NO LLM synthesis.
 */
import { fetchWithTimeout } from "@/lib/providers/base";
import { config } from "@/lib/config";
import { clean } from "../clean";
import { makeResponse, classifyError, classifyHttp } from "../engineUtil";
import type { WebEngine, SearchRequest, WebResult } from "../types";

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  published_date?: string;
}

export const tavilyEngine: WebEngine = {
  id: "tavily",
  name: "Tavily Search",
  maxConcurrency: 3,
  minIntervalMs: 0,
  isConfigured() {
    return config.tavily.configured;
  },
  isEnabled() {
    return config.search.enabled("tavily");
  },
  async search(req: SearchRequest) {
    const started = Date.now();
    if (!this.isConfigured()) return makeResponse("tavily", "not_configured", started);
    try {
      const body: Record<string, unknown> = {
        query: req.query,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
        max_results: req.count ?? 8,
      };
      if (req.country) body.country = req.country;
      if (req.includeDomains?.length) body.include_domains = req.includeDomains;
      if (req.excludeDomains?.length) body.exclude_domains = req.excludeDomains;
      const res = await fetchWithTimeout("https://api.tavily.com/search", {
        method: "POST",
        timeoutMs: 8000,
        parentSignal: req.signal,
        headers: {
          Authorization: `Bearer ${config.tavily.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const bad = classifyHttp(res.status);
      if (bad) return makeResponse("tavily", bad, started, [], `Tavily HTTP ${res.status}`);
      const data = (await res.json()) as { results?: TavilyResult[] };
      const results: WebResult[] = (data.results ?? []).map((r) => ({
        title: clean(r.title),
        url: r.url,
        snippet: clean(r.content ?? ""),
        publishedAt: r.published_date,
        source: "tavily",
      }));
      return makeResponse("tavily", results.length ? "success" : "no_results", started, results);
    } catch (err) {
      const { status, error } = classifyError(err);
      return makeResponse("tavily", status, started, [], error);
    }
  },
};
