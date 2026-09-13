/**
 * Common web-search engine contract (milestone §12).
 *
 * Brave, You.com and Tavily each implement this interface as a RAW web-search
 * engine — no LLM answers, no autonomous research. The router (see router.ts)
 * selects one engine per investigation and falls back to the next only on
 * operational failure.
 */

export type WebEngineId = "brave" | "you" | "tavily";

/** Operational outcome of a single engine call. */
export type WebSearchStatus =
  | "success"
  | "no_results"
  | "not_configured"
  | "rate_limited"
  | "quota_exhausted"
  | "timeout"
  | "error";

/** Statuses that mean "this engine could not do the job" → eligible for fallback. */
export const OPERATIONAL_FAILURES: ReadonlySet<WebSearchStatus> = new Set([
  "not_configured",
  "rate_limited",
  "quota_exhausted",
  "timeout",
  "error",
]);

export interface SearchRequest {
  query: string;
  count?: number;
  country?: string;
  language?: string;
  freshness?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  signal?: AbortSignal;
}

/** Normalised search result — identical shape regardless of engine. */
export interface WebResult {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  source?: string;
}

export interface QuotaInfo {
  remaining?: number;
  limit?: number;
  resetsAt?: string;
}

export interface SearchResponse {
  provider: WebEngineId;
  status: WebSearchStatus;
  results: WebResult[];
  durationMs: number;
  error?: string;
  quota?: QuotaInfo;
}

export interface WebEngine {
  id: WebEngineId;
  name: string;
  /** True when an API key is present. */
  isConfigured(): boolean;
  /** True unless disabled via env (e.g. YOU_SEARCH_ENABLED=false). */
  isEnabled(): boolean;
  /** Max concurrent queries this engine tolerates on the free tier. */
  maxConcurrency: number;
  /** Minimum spacing between calls (ms) to respect rate limits. */
  minIntervalMs: number;
  search(req: SearchRequest): Promise<SearchResponse>;
}
