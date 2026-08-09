/**
 * Search orchestrator (§23).
 *
 * Pipeline: validate → normalise → generate queries → select providers →
 * execute concurrently (capped, per-provider timeout, graceful failure) →
 * stream provider states → resolve candidates → build report. One provider
 * failing never kills the search.
 */
import type { SearchInput, SearchEvent, ProviderResult, SearchReport, Candidate, ProviderCategory } from "@/types/core";
import { validateAndNormalise } from "@/lib/validation";
import { generateQueries } from "@/lib/query/generator";
import { providers as realProviders } from "@/lib/providers/registry";
import { demoProviders } from "@/lib/providers/demo";
import { type Provider, type ProviderContext, runProviderSafely } from "@/lib/providers/base";
import { resolveCandidates } from "@/lib/resolve";
import { config } from "@/lib/config";

const OVERALL_TIMEOUT_MS = 18_000;
const PER_PROVIDER_TIMEOUT_MS = 11_000;
const CONCURRENCY = 6;

export interface OrchestratorOptions {
  /** Override demo mode (tests). Defaults to config.demoMode. */
  demoMode?: boolean;
  overallTimeoutMs?: number;
}

/** Drain the streaming search into a single report (used by tests & non-stream callers). */
export async function collectSearch(input: SearchInput, opts: OrchestratorOptions = {}): Promise<SearchReport> {
  let report: SearchReport | null = null;
  for await (const ev of runSearch(input, opts)) {
    if (ev.kind === "report") report = ev.report;
    if (ev.kind === "fatal") throw new Error(ev.message);
  }
  if (!report) throw new Error("Search produced no report");
  return report;
}

/**
 * Run a search, yielding SearchEvents as providers settle.
 */
export async function* runSearch(input: SearchInput, opts: OrchestratorOptions = {}): AsyncGenerator<SearchEvent> {
  const startedAt = new Date().toISOString();
  const { ok, errors, normalised, signals } = validateAndNormalise(input);
  if (!ok) {
    yield { kind: "fatal", message: Object.values(errors)[0] ?? "Invalid input" };
    return;
  }

  const queries = generateQueries(input, normalised);
  const demoMode = opts.demoMode ?? config.demoMode;

  // Select applicable providers.
  const abort = new AbortController();
  const overallTimer = setTimeout(() => abort.abort(new Error("overall timeout")), opts.overallTimeoutMs ?? OVERALL_TIMEOUT_MS);

  const ctx: ProviderContext = { input, normalised, queries, signal: abort.signal };
  const pool: Provider[] = [...realProviders, ...(demoMode ? demoProviders : [])].filter((p) => {
    try {
      return p.appliesTo(ctx);
    } catch {
      return false;
    }
  });

  yield {
    kind: "meta",
    normalised,
    queries,
    providerList: pool.map((p) => ({ provider: p.id, providerLabel: p.label, category: p.category })),
  };

  const collected: ProviderResult[] = [];
  try {
    // Concurrency-limited pool; yield each result as it settles.
    const queue = [...pool];
    const inflight = new Set<Promise<void>>();
    const settled: ProviderResult[] = [];
    const emit: ProviderResult[] = [];

    const launch = (provider: Provider) => {
      const task = runProviderSafely(provider, ctx, PER_PROVIDER_TIMEOUT_MS).then((res) => {
        settled.push(res);
        emit.push(res);
      });
      inflight.add(task);
      task.finally(() => inflight.delete(task));
    };

    while (queue.length || inflight.size) {
      while (queue.length && inflight.size < CONCURRENCY) launch(queue.shift()!);
      // Wait for at least one to settle, then flush any newly emitted results.
      await Promise.race(inflight);
      while (emit.length) {
        const res = emit.shift()!;
        collected.push(res);
        yield { kind: "provider", result: res };
      }
    }
    // Flush stragglers (defensive).
    while (emit.length) {
      const res = emit.shift()!;
      collected.push(res);
      yield { kind: "provider", result: res };
    }
  } finally {
    clearTimeout(overallTimer);
  }

  const candidates: Candidate[] = resolveCandidates(signals, collected);
  yield { kind: "candidates", candidates };

  const report = buildReport(input, normalised, queries, collected, candidates, startedAt);
  yield { kind: "report", report };
}

function buildReport(
  input: SearchInput,
  normalised: Record<string, string>,
  queries: string[],
  providers: ProviderResult[],
  candidates: Candidate[],
  startedAt: string,
): SearchReport {
  const sourcesChecked = providers.length;
  const withResults = providers.filter((p) => p.status === "complete").length;
  const references = providers.reduce((acc, p) => acc + p.results.length, 0);
  const demo = providers.some((p) => p.demo);

  const notices: string[] = [];
  const notConfigured = providers.filter((p) => p.status === "not_configured");
  for (const p of notConfigured) {
    notices.push(`${p.providerLabel}: ${p.warnings[0] ?? "not configured"}`);
  }
  const errored = providers.filter((p) => p.status === "error");
  if (errored.length) notices.push(`${errored.length} source(s) errored and were skipped.`);
  if (demo) notices.push("Some results are clearly-labelled demo data (CHECKFIRST_DEMO_MODE is on).");

  return {
    input,
    normalised,
    queries,
    providers,
    candidates,
    summary: { sourcesChecked, sourcesWithResults: withResults, references, demo },
    notices,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

/** Group provider results by category for the report UI. */
export function groupByCategory(providers: ProviderResult[]): Record<ProviderCategory, ProviderResult[]> {
  const out = {} as Record<ProviderCategory, ProviderResult[]>;
  for (const p of providers) {
    (out[p.category] ??= []).push(p);
  }
  return out;
}
