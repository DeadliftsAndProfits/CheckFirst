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
import { buildIdentity } from "@/lib/identity";
import { computeSummary } from "@/lib/reportSummary";
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
    providerList: pool.map((p) => ({ provider: p.id, providerLabel: p.label, category: p.category, dataOrigin: p.dataOrigin })),
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

  let candidates: Candidate[] = resolveCandidates(signals, collected);
  // Synthesise a best-fit identity for person/business searches and lead with it.
  const identity = buildIdentity(input, normalised, collected);
  if (identity) candidates = [identity.candidate, ...candidates];
  yield { kind: "candidates", candidates };

  const diagnostics = buildDiagnostics(queries, collected, startedAt);
  const report = buildReport(input, normalised, queries, collected, candidates, startedAt, identity?.summary, diagnostics);
  yield { kind: "report", report };
}

/** Per-investigation developer diagnostics (§40, §48). Logged + attached to the report. */
function buildDiagnostics(queries: string[], providers: ProviderResult[], startedAt: string): Record<string, unknown> {
  const web = providers.find((p) => p.provider === "websearch");
  const webMetrics = (web?.diagnostics?.web ?? null) as Record<string, unknown> | null;
  const structuredProviderCalls = providers.filter(
    (p) => p.category !== "web" && (p.dataOrigin === "live" || p.dataOrigin === "cached" || p.dataOrigin === "local_dataset"),
  ).length;
  const diagnostics: Record<string, unknown> = {
    candidateWebQueriesGenerated: queries.length,
    selectedWebProvider: (webMetrics?.selectedWebProvider as string | null) ?? null,
    structuredProviderCalls,
    investigationDurationMs: Date.now() - new Date(startedAt).getTime(),
    web: webMetrics,
  };
  console.info("[investigation] diagnostics", JSON.stringify(diagnostics));
  return diagnostics;
}

function buildReport(
  input: SearchInput,
  normalised: Record<string, string>,
  queries: string[],
  providers: ProviderResult[],
  candidates: Candidate[],
  startedAt: string,
  identity?: SearchReport["identity"],
  diagnostics?: Record<string, unknown>,
): SearchReport {
  const summary = computeSummary(providers);
  const notices: string[] = [];
  for (const p of providers.filter((p) => p.status === "not_configured")) {
    notices.push(`${p.providerLabel}: ${p.warnings[0] ?? "not configured"}`);
  }
  if (summary.errored) notices.push(`${summary.errored} source(s) errored and were skipped.`);
  if (summary.demo) notices.push("Demo mode is ON — some results are clearly-labelled demo data, not real searches.");

  return {
    input,
    normalised,
    queries,
    providers,
    candidates,
    identity,
    summary,
    notices,
    diagnostics,
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
