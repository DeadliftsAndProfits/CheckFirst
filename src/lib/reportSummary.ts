/**
 * Pure, dependency-free honest summary of a set of provider results.
 * Shared by the orchestrator (final report) and the /search page (live/partial
 * report) so the numbers can never disagree.
 */
import type { ProviderResult, SearchReport } from "@/types/core";

const REAL = new Set(["live", "local_dataset", "cached"]);

export function computeSummary(providers: ProviderResult[]): SearchReport["summary"] {
  const real = providers.filter((p) => REAL.has(p.dataOrigin));
  const links = providers.filter((p) => p.dataOrigin === "link");

  const returnedResults = real.filter((p) => p.status === "complete").length;
  const noResults = real.filter((p) => p.status === "no_results").length;
  const unavailable = real.filter((p) => p.status === "unavailable" || p.status === "rate_limited").length;
  const errored = real.filter((p) => p.status === "error").length;
  const needsConfig = providers.filter((p) => p.status === "not_configured").length;

  return {
    sourcesSearched: returnedResults + noResults + unavailable + errored,
    returnedResults,
    noResults,
    unavailable,
    needsConfig,
    errored,
    links: links.filter((p) => p.status === "complete").reduce((a, p) => a + p.results.length, 0),
    references: real.filter((p) => p.status === "complete").reduce((a, p) => a + p.results.length, 0),
    demo: providers.some((p) => p.demo),
  };
}
