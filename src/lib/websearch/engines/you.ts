/**
 * You.com Web Search API engine — RAW web results only (milestone §45).
 * POST https://ydc-index.io/v1/search  (header: X-API-Key)
 *
 * We deliberately use ONLY the Web Search endpoint — never the Answer or
 * Research (LLM-synthesis) APIs.
 */
import { fetchWithTimeout } from "@/lib/providers/base";
import { config } from "@/lib/config";
import { clean } from "../clean";
import { makeResponse, classifyError, classifyHttp } from "../engineUtil";
import type { WebEngine, SearchRequest, WebResult } from "../types";

interface YouWebResult {
  url: string;
  title: string;
  description?: string;
  snippets?: string[];
  page_age?: string;
}

export const youEngine: WebEngine = {
  id: "you",
  name: "You.com Web Search",
  maxConcurrency: 2,
  minIntervalMs: 200,
  isConfigured() {
    return config.you.configured;
  },
  isEnabled() {
    return config.search.enabled("you");
  },
  async search(req: SearchRequest) {
    const started = Date.now();
    if (!this.isConfigured()) return makeResponse("you", "not_configured", started);
    try {
      const body: Record<string, unknown> = { query: req.query, count: req.count ?? 8 };
      if (req.country) body.country = req.country;
      if (req.language) body.language = req.language;
      if (req.freshness) body.freshness = req.freshness;
      if (req.includeDomains?.length) body.include_domains = req.includeDomains;
      if (req.excludeDomains?.length) body.exclude_domains = req.excludeDomains;
      const res = await fetchWithTimeout("https://ydc-index.io/v1/search", {
        method: "POST",
        timeoutMs: 8000,
        parentSignal: req.signal,
        headers: { "X-API-Key": config.you.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const bad = classifyHttp(res.status);
      if (bad) return makeResponse("you", bad, started, [], `You.com HTTP ${res.status}`);
      const data = (await res.json()) as { results?: { web?: YouWebResult[] } };
      const results: WebResult[] = (data.results?.web ?? []).map((r) => ({
        title: clean(r.title),
        url: r.url,
        snippet: clean(r.snippets?.join(" ") || r.description || ""),
        publishedAt: r.page_age,
        source: "you",
      }));
      return makeResponse("you", results.length ? "success" : "no_results", started, results);
    } catch (err) {
      const { status, error } = classifyError(err);
      return makeResponse("you", status, started, [], error);
    }
  },
};
