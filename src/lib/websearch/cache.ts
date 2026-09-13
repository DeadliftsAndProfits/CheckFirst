/**
 * In-memory web-search cache (milestone §21–§24; persistence deferred by product
 * decision — this resets on server restart). Cache is checked BEFORE any API
 * call, so re-running or editing a search reuses results and spends no credits.
 */
import type { WebEngineId, WebResult, WebSearchStatus } from "./types";

export interface CacheEntry {
  at: number;
  ttlMs: number;
  status: WebSearchStatus;
  results: WebResult[];
}

const store = new Map<string, CacheEntry>();

export function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

export function cacheKey(
  engine: WebEngineId,
  query: string,
  opts: { country?: string; language?: string; freshness?: string; count?: number } = {},
): string {
  return [engine, normalizeQuery(query), opts.country ?? "", opts.language ?? "", opts.freshness ?? "", opts.count ?? 8].join("|");
}

/** Returns a live (non-expired) entry, or null. */
export function getCached(key: string): CacheEntry | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() - e.at >= e.ttlMs) {
    store.delete(key);
    return null;
  }
  return e;
}

/** Cache only genuine outcomes (success / no_results) — never operational failures. */
export function setCached(key: string, status: WebSearchStatus, results: WebResult[], ttlMs: number): void {
  if (status !== "success" && status !== "no_results") return;
  store.set(key, { at: Date.now(), ttlMs, status, results });
}

/** Test/maintenance helper. */
export function clearCache(): void {
  store.clear();
}
