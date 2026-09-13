/** Small shared helpers for web-search engines. */
import type { SearchResponse, WebEngineId, WebResult, WebSearchStatus, QuotaInfo } from "./types";

export function makeResponse(
  provider: WebEngineId,
  status: WebSearchStatus,
  startedAt: number,
  results: WebResult[] = [],
  error?: string,
  quota?: QuotaInfo,
): SearchResponse {
  return { provider, status, results, durationMs: Date.now() - startedAt, error, quota };
}

/** Turn a thrown error/abort into an honest terminal status. */
export function classifyError(err: unknown): { status: WebSearchStatus; error: string } {
  const msg = err instanceof Error ? err.message : "request failed";
  if (/timeout|abort/i.test(msg)) return { status: "timeout", error: msg };
  return { status: "error", error: msg };
}

/** HTTP status → terminal status for the common cases. Returns null when OK. */
export function classifyHttp(httpStatus: number): WebSearchStatus | null {
  if (httpStatus === 429) return "rate_limited";
  if (httpStatus === 402) return "quota_exhausted";
  if (httpStatus === 401 || httpStatus === 403) return "error"; // key rejected → fallback-eligible
  if (httpStatus >= 400) return "error";
  return null;
}
