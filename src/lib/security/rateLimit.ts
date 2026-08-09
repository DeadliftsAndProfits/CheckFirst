/**
 * Minimal in-memory sliding-window rate limiter (§30).
 *
 * MVP-scope: process-local. A multi-instance deployment should swap this for a
 * shared store (Redis) — documented as a P1 extension point.
 */
import { config } from "@/lib/config";

const hits = new Map<string, number[]>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string): RateResult {
  const { max, windowSeconds } = config.rateLimit();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (arr.length >= max) {
    const oldest = arr[0];
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    hits.set(key, arr);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  arr.push(now);
  hits.set(key, arr);
  return { allowed: true, remaining: max - arr.length, retryAfterSeconds: 0 };
}

/** Periodic cleanup to bound memory. */
export function sweepRateLimits(): void {
  const { windowSeconds } = config.rateLimit();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  for (const [k, arr] of hits) {
    const kept = arr.filter((t) => now - t < windowMs);
    if (kept.length) hits.set(k, kept);
    else hits.delete(k);
  }
}
