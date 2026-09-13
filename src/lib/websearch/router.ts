/**
 * Multi-provider web-search router (milestone §5, §13–§19, §30).
 *
 * Contract:
 *  - PLAN ONCE: caller passes the already-generated queries. The router never
 *    invents new queries or loops on result quality.
 *  - STICKY: one engine is chosen per investigation (first configured + enabled
 *    + not-cooling-down engine in SEARCH_PROVIDER_ORDER). All queries use it.
 *  - CACHE BEFORE API: every query checks the cache before spending a call.
 *  - FALLBACK only on OPERATIONAL failure (rate/quota/timeout/outage/config),
 *    never because results are weak or empty (§16). Zero results is a success.
 *  - MID-INVESTIGATION FALLBACK: only queries that failed operationally are
 *    retried on the next engine; successful queries are never re-run (§30).
 */
import { config } from "@/lib/config";
import { orderedEngines } from "./registry";
import { cacheKey, getCached, setCached } from "./cache";
import * as usage from "./usage";
import { OPERATIONAL_FAILURES, type WebEngine, type WebEngineId, type WebResult, type WebSearchStatus } from "./types";

const QUOTA_COOLDOWN_MS = 10 * 60 * 1000; // quota exhausted → rest 10 min
const RATE_COOLDOWN_MS = 30 * 1000; // rate limited → brief rest

export interface RoutedResult extends WebResult {
  query: string;
  engine: WebEngineId;
  retrievedAt: string;
  cacheStatus: "hit" | "miss";
}

export interface PerQueryTrace {
  query: string;
  engine?: WebEngineId;
  status: WebSearchStatus | "cache";
  results: number;
}

export interface WebSearchMetrics {
  candidateWebQueriesGenerated: number;
  webQueriesExecuted: number;
  webQueriesServedFromCache: number;
  webApiCallsConsumed: number;
  providerFallbacks: number;
  selectedWebProvider: WebEngineId | null;
  enginesUsed: WebEngineId[];
  perQuery: PerQueryTrace[];
}

export type WebSearchOverall = "success" | "no_results" | "not_configured" | "unavailable";

export interface WebSearchOutcome {
  status: WebSearchOverall;
  results: RoutedResult[];
  metrics: WebSearchMetrics;
  warnings: string[];
}

export interface RunOptions {
  signal?: AbortSignal;
  ttlMs: number;
  count?: number;
  country?: string;
  language?: string;
  freshness?: string;
  /** Test hook: inject engines instead of the configured registry. */
  engines?: WebEngine[];
  /** Test hook: ignore cooldown state. */
  ignoreCooldown?: boolean;
}

/** Run a list of tasks with bounded concurrency and paced starts. */
async function mapPaced<I, O>(items: I[], worker: (i: I) => Promise<O>, concurrency: number, minIntervalMs: number): Promise<O[]> {
  const out: O[] = new Array(items.length);
  let idx = 0;
  let lastStart = 0;
  async function runner(): Promise<void> {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      if (minIntervalMs > 0) {
        const wait = lastStart + minIntervalMs - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }
      lastStart = Date.now();
      out[i] = await worker(items[i]);
    }
  }
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => runner());
  await Promise.all(runners);
  return out;
}

/** Normalise + dedupe the incoming queries (exact duplicates only). */
function dedupe(queries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of queries) {
    const q = raw.trim().replace(/\s+/g, " ");
    if (!q) continue;
    const norm = q.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(q);
  }
  return out;
}

export async function runWebSearch(queries: string[], opts: RunOptions): Promise<WebSearchOutcome> {
  const unique = dedupe(queries).slice(0, config.search.querySafetyMax);
  const metrics: WebSearchMetrics = {
    candidateWebQueriesGenerated: unique.length,
    webQueriesExecuted: 0,
    webQueriesServedFromCache: 0,
    webApiCallsConsumed: 0,
    providerFallbacks: 0,
    selectedWebProvider: null,
    enginesUsed: [],
    perQuery: [],
  };
  const warnings: string[] = [];

  if (!unique.length) return { status: "no_results", results: [], metrics, warnings };

  const all = (opts.engines ?? orderedEngines()).filter((e) => e.isEnabled());
  const configured = all.filter((e) => e.isConfigured());
  if (!configured.length) {
    return { status: "not_configured", results: [], metrics, warnings: ["No web-search engine is configured (Brave, You.com or Tavily)."] };
  }
  const order = configured.filter((e) => opts.ignoreCooldown || !usage.isCoolingDown(e.id));
  if (!order.length) {
    return { status: "unavailable", results: [], metrics, warnings: ["All configured web-search engines are temporarily cooling down."] };
  }

  metrics.selectedWebProvider = order[0].id;
  const results: RoutedResult[] = [];
  const resolved = new Set<string>(); // query strings that reached a terminal non-failure
  const traceByQuery = new Map<string, PerQueryTrace>();
  let remaining = [...unique];

  for (let engineIdx = 0; engineIdx < order.length && remaining.length; engineIdx++) {
    const engine = order[engineIdx];
    if (engineIdx > 0) metrics.providerFallbacks++;
    let engineDidRun = false;

    const outcomes = await mapPaced(
      remaining,
      async (query) => {
        // Cache before API (§22).
        const key = cacheKey(engine.id, query, opts);
        const cached = getCached(key);
        if (cached) {
          usage.recordCacheHit(engine.id);
          metrics.webQueriesServedFromCache++;
          return { query, status: cached.status, results: cached.results, retrievedAt: new Date(cached.at).toISOString(), fromCache: true as const };
        }
        engineDidRun = true;
        const resp = await engine.search({
          query,
          count: opts.count,
          country: opts.country,
          language: opts.language,
          freshness: opts.freshness,
          signal: opts.signal,
        });
        usage.recordAttempt(engine.id, resp.status);
        metrics.webApiCallsConsumed++;
        if (resp.status === "success" || resp.status === "no_results") setCached(key, resp.status, resp.results, opts.ttlMs);
        if (resp.status === "quota_exhausted") usage.cooldown(engine.id, QUOTA_COOLDOWN_MS);
        else if (resp.status === "rate_limited") usage.cooldown(engine.id, RATE_COOLDOWN_MS);
        return { query, status: resp.status, results: resp.results, retrievedAt: new Date().toISOString(), fromCache: false as const };
      },
      engine.maxConcurrency,
      engine.minIntervalMs,
    );

    if (engineDidRun && !metrics.enginesUsed.includes(engine.id)) metrics.enginesUsed.push(engine.id);

    const stillFailing: string[] = [];
    for (const o of outcomes) {
      const isFailure = OPERATIONAL_FAILURES.has(o.status as WebSearchStatus);
      // A query is "executed" once (first time we attempt it across engines).
      if (!traceByQuery.has(o.query)) metrics.webQueriesExecuted++;
      traceByQuery.set(o.query, {
        query: o.query,
        engine: engine.id,
        status: o.fromCache ? "cache" : (o.status as WebSearchStatus),
        results: o.results.length,
      });
      if (isFailure) {
        stillFailing.push(o.query); // retry on next engine (§30)
        continue;
      }
      // Terminal non-failure (success OR no_results) — resolved, never retried (§16).
      resolved.add(o.query);
      for (const r of o.results) {
        results.push({ ...r, query: o.query, engine: engine.id, retrievedAt: o.retrievedAt, cacheStatus: o.fromCache ? "hit" : "miss" });
      }
    }
    remaining = stillFailing;
  }

  metrics.perQuery = [...traceByQuery.values()];
  if (remaining.length) warnings.push(`${remaining.length} web quer${remaining.length === 1 ? "y" : "ies"} could not be completed by any engine.`);

  let status: WebSearchOverall;
  if (results.length) status = "success";
  else if (remaining.length) status = "unavailable"; // operational failures, nothing recovered
  else status = "no_results"; // every query genuinely returned nothing

  return { status, results, metrics, warnings };
}
