/**
 * Provider base: the common contract (§22) plus helpers for building results,
 * fetching with a timeout, and running a provider safely so one failure never
 * kills the search (§23).
 */
import type {
  ProviderResult,
  ProviderStatus,
  ProviderCategory,
  ResultItem,
  SearchInput,
  SourceClass,
  DataOrigin,
} from "@/types/core";

/** Everything a provider needs to run. */
export interface ProviderContext {
  input: SearchInput;
  normalised: Record<string, string>;
  queries: string[];
  /** Abort signal wired to the orchestrator's overall timeout. */
  signal: AbortSignal;
}

export interface Provider {
  /** Stable machine id, e.g. "dns". */
  id: string;
  /** Human label, e.g. "DNS & mail records". */
  label: string;
  category: ProviderCategory;
  /** Default source authority/classification. */
  sourceClass: SourceClass;
  /** Where this provider's data comes from — the honesty axis (R3). */
  dataOrigin: DataOrigin;
  /** Which search types this provider applies to. */
  appliesTo(ctx: ProviderContext): boolean;
  /** Run the lookup. Should not throw; use fail()/notConfigured() helpers. */
  run(ctx: ProviderContext): Promise<ProviderResult>;
}

interface BuildOpts {
  provider: Provider;
  status: ProviderStatus;
  query: string;
  results?: ResultItem[];
  sourceUrl?: string;
  sourceAuthority?: string;
  warnings?: string[];
  error?: string;
  cacheSeconds?: number;
}

export function buildResult(opts: BuildOpts): ProviderResult {
  const now = new Date();
  const demo = (opts.results ?? []).some((r) => r.demo);
  return {
    provider: opts.provider.id,
    providerLabel: opts.provider.label,
    category: opts.provider.category,
    status: opts.status,
    query: opts.query,
    timestamp: now.toISOString(),
    results: opts.results ?? [],
    sourceUrl: opts.sourceUrl,
    sourceAuthority: opts.sourceAuthority,
    sourceClass: opts.provider.sourceClass,
    dataOrigin: demo ? "demo" : opts.provider.dataOrigin,
    warnings: opts.warnings ?? [],
    error: opts.error,
    cacheExpiry: opts.cacheSeconds
      ? new Date(now.getTime() + opts.cacheSeconds * 1000).toISOString()
      : undefined,
    demo: demo || undefined,
  };
}

export function ok(provider: Provider, query: string, results: ResultItem[], extra: Partial<BuildOpts> = {}) {
  return buildResult({
    provider,
    status: results.length ? "complete" : "no_results",
    query,
    results,
    ...extra,
  });
}

export function noResults(provider: Provider, query: string, extra: Partial<BuildOpts> = {}) {
  return buildResult({ provider, status: "no_results", query, results: [], ...extra });
}

export function notConfigured(provider: Provider, query: string, warning: string) {
  return buildResult({ provider, status: "not_configured", query, warnings: [warning] });
}

export function fail(provider: Provider, query: string, error: string) {
  return buildResult({ provider, status: "error", query, error });
}

/** fetch() with an AbortController timeout that also respects a parent signal. */
export async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number; parentSignal?: AbortSignal } = {},
): Promise<Response> {
  const { timeoutMs = 8000, parentSignal, ...init } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const onParentAbort = () => controller.abort(new Error("aborted"));
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": "CheckFirst/0.1 (+public-information verification)", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Run a provider with a hard timeout, converting any thrown error / abort into
 * an honest error or unavailable result. Never rejects.
 */
export async function runProviderSafely(provider: Provider, ctx: ProviderContext, timeoutMs: number): Promise<ProviderResult> {
  const query = ctx.queries[0] ?? ctx.normalised.fullName ?? ctx.normalised.website ?? "";
  const started = Date.now();
  const timeout = new Promise<ProviderResult>((resolve) => {
    const t = setTimeout(() => {
      resolve(buildResult({ provider, status: "unavailable", query, warnings: ["Provider timed out"] }));
    }, timeoutMs);
    // Allow GC if run resolves first.
    ctx.signal.addEventListener("abort", () => clearTimeout(t), { once: true });
  });
  let result: ProviderResult;
  try {
    result = await Promise.race([provider.run(ctx), timeout]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    result = fail(provider, query, message);
  }
  result.durationMs = Date.now() - started;
  return result;
}
