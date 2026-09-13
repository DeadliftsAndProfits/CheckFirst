/**
 * In-memory per-engine usage tracking + cooldown (milestone §28–§29).
 * Resets on restart (persistence deferred). Used to avoid hammering an engine
 * that is known to be down / quota-exhausted, and to expose diagnostics.
 */
import type { WebEngineId, WebSearchStatus } from "./types";

export interface EngineUsage {
  attempted: number;
  successful: number;
  failed: number;
  cacheHits: number;
  cacheMisses: number;
  lastRequest?: string;
  lastSuccess?: string;
  lastError?: string;
  cooldownUntil?: number;
}

const usage = new Map<WebEngineId, EngineUsage>();

function get(id: WebEngineId): EngineUsage {
  let u = usage.get(id);
  if (!u) {
    u = { attempted: 0, successful: 0, failed: 0, cacheHits: 0, cacheMisses: 0 };
    usage.set(id, u);
  }
  return u;
}

export function recordCacheHit(id: WebEngineId): void {
  get(id).cacheHits++;
}

export function recordAttempt(id: WebEngineId, status: WebSearchStatus): void {
  const u = get(id);
  u.attempted++;
  u.cacheMisses++;
  u.lastRequest = new Date().toISOString();
  if (status === "success" || status === "no_results") {
    u.successful++;
    u.lastSuccess = new Date().toISOString();
  } else {
    u.failed++;
    u.lastError = status;
  }
}

/** Put an engine into cooldown after a hard operational failure. */
export function cooldown(id: WebEngineId, ms: number): void {
  get(id).cooldownUntil = Date.now() + ms;
}

export function isCoolingDown(id: WebEngineId): boolean {
  const until = get(id).cooldownUntil;
  return until !== undefined && Date.now() < until;
}

export function snapshot(): Record<string, EngineUsage> {
  return Object.fromEntries(usage.entries());
}

/** Test helper. */
export function resetUsage(): void {
  usage.clear();
}
