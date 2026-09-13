import { describe, it, expect, beforeEach } from "vitest";
import { runWebSearch } from "@/lib/websearch/router";
import { clearCache } from "@/lib/websearch/cache";
import { resetUsage, isCoolingDown } from "@/lib/websearch/usage";
import type { WebEngine, SearchResponse, WebSearchStatus, WebResult } from "@/lib/websearch/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hit = (url: string, title = "t"): WebResult => ({ title, url, snippet: "s" });
const resp = (provider: WebEngine["id"], status: WebSearchStatus, results: WebResult[] = []): SearchResponse => ({
  provider,
  status,
  results,
  durationMs: 1,
});

interface Mock extends WebEngine {
  calls: string[];
}
function mockEngine(
  id: WebEngine["id"],
  handler: (q: string) => SearchResponse | Promise<SearchResponse>,
  o: { configured?: boolean; enabled?: boolean; maxConcurrency?: number; minIntervalMs?: number } = {},
): Mock {
  const calls: string[] = [];
  return {
    id,
    name: id,
    calls,
    maxConcurrency: o.maxConcurrency ?? 3,
    minIntervalMs: o.minIntervalMs ?? 0,
    isConfigured: () => o.configured ?? true,
    isEnabled: () => o.enabled ?? true,
    async search(req) {
      calls.push(req.query);
      return handler(req.query);
    },
  };
}

const TTL = 60_000;
beforeEach(() => {
  clearCache();
  resetUsage();
});

describe("web-search router — provider selection & fallback (§49)", () => {
  it("Brave healthy: Brave used, others untouched", async () => {
    const brave = mockEngine("brave", (q) => resp("brave", "success", [hit(`https://b/${q}`)]));
    const you = mockEngine("you", () => resp("you", "success", [hit("https://y")]));
    const tavily = mockEngine("tavily", () => resp("tavily", "success", [hit("https://t")]));
    const out = await runWebSearch(["q1", "q2"], { ttlMs: TTL, engines: [brave, you, tavily], ignoreCooldown: true });
    expect(out.status).toBe("success");
    expect(out.metrics.selectedWebProvider).toBe("brave");
    expect(out.metrics.providerFallbacks).toBe(0);
    expect(brave.calls.sort()).toEqual(["q1", "q2"]);
    expect(you.calls).toEqual([]);
    expect(tavily.calls).toEqual([]);
    expect(out.results).toHaveLength(2);
  });

  it("Brave unavailable → You.com selected", async () => {
    const brave = mockEngine("brave", () => resp("brave", "error"));
    const you = mockEngine("you", (q) => resp("you", "success", [hit(`https://y/${q}`)]));
    const tavily = mockEngine("tavily", () => resp("tavily", "success", [hit("https://t")]));
    const out = await runWebSearch(["q1", "q2"], { ttlMs: TTL, engines: [brave, you, tavily], ignoreCooldown: true });
    expect(out.status).toBe("success");
    expect(out.metrics.providerFallbacks).toBe(1);
    expect(brave.calls.sort()).toEqual(["q1", "q2"]);
    expect(you.calls.sort()).toEqual(["q1", "q2"]);
    expect(tavily.calls).toEqual([]);
    expect(out.metrics.enginesUsed).toContain("you");
  });

  it("Brave + You.com unavailable → Tavily", async () => {
    const brave = mockEngine("brave", () => resp("brave", "error"));
    const you = mockEngine("you", () => resp("you", "timeout"));
    const tavily = mockEngine("tavily", (q) => resp("tavily", "success", [hit(`https://t/${q}`)]));
    const out = await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave, you, tavily], ignoreCooldown: true });
    expect(out.status).toBe("success");
    expect(out.metrics.providerFallbacks).toBe(2);
    expect(tavily.calls).toEqual(["q1"]);
  });

  it("all engines unavailable → honest failure", async () => {
    const brave = mockEngine("brave", () => resp("brave", "error"));
    const you = mockEngine("you", () => resp("you", "error"));
    const tavily = mockEngine("tavily", () => resp("tavily", "error"));
    const out = await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave, you, tavily], ignoreCooldown: true });
    expect(out.status).toBe("unavailable");
    expect(out.results).toEqual([]);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it("no engine configured → not_configured", async () => {
    const brave = mockEngine("brave", () => resp("brave", "success"), { configured: false });
    const out = await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave] });
    expect(out.status).toBe("not_configured");
  });
});

describe("web-search router — weak/zero results do NOT trigger fallback (§16)", () => {
  it("zero results is a successful search, no fallback", async () => {
    const brave = mockEngine("brave", () => resp("brave", "no_results", []));
    const you = mockEngine("you", () => resp("you", "success", [hit("https://y")]));
    const out = await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave, you], ignoreCooldown: true });
    expect(out.status).toBe("no_results");
    expect(out.metrics.providerFallbacks).toBe(0);
    expect(you.calls).toEqual([]);
  });

  it("weak (few) results do not trigger fallback", async () => {
    const brave = mockEngine("brave", () => resp("brave", "success", [hit("https://b/1")]));
    const you = mockEngine("you", () => resp("you", "success", [hit("https://y")]));
    const out = await runWebSearch(["q1", "q2"], { ttlMs: TTL, engines: [brave, you], ignoreCooldown: true });
    expect(out.status).toBe("success");
    expect(you.calls).toEqual([]);
  });
});

describe("web-search router — quota + mid-investigation fallback (§29, §30)", () => {
  it("quota exhaustion falls back and cools the engine down", async () => {
    const brave = mockEngine("brave", () => resp("brave", "quota_exhausted"));
    const you = mockEngine("you", (q) => resp("you", "success", [hit(`https://y/${q}`)]));
    const out = await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave, you] });
    expect(out.status).toBe("success");
    expect(out.metrics.providerFallbacks).toBe(1);
    expect(isCoolingDown("brave")).toBe(true);
  });

  it("only failed queries are retried on the next engine; successes are not re-run", async () => {
    const brave = mockEngine("brave", (q) => (q === "q2" ? resp("brave", "error") : resp("brave", "success", [hit(`https://b/${q}`)])));
    const you = mockEngine("you", (q) => resp("you", "success", [hit(`https://y/${q}`)]));
    const out = await runWebSearch(["q1", "q2", "q3"], { ttlMs: TTL, engines: [brave, you], ignoreCooldown: true });
    expect(brave.calls.sort()).toEqual(["q1", "q2", "q3"]);
    expect(you.calls).toEqual(["q2"]); // only the failed query
    expect(out.results).toHaveLength(3);
  });
});

describe("web-search router — concurrency (§50)", () => {
  it("runs multiple sub-queries concurrently on the selected engine", async () => {
    let current = 0;
    let max = 0;
    const tavily = mockEngine(
      "tavily",
      async () => {
        current++;
        max = Math.max(max, current);
        await delay(20);
        current--;
        return resp("tavily", "success", [hit("https://t/" + Math.random())]);
      },
      { maxConcurrency: 3 },
    );
    await runWebSearch(["a", "b", "c", "d"], { ttlMs: TTL, engines: [tavily], ignoreCooldown: true });
    expect(max).toBeGreaterThanOrEqual(2);
  });
});

describe("web-search router — cache (§21–§25)", () => {
  it("repeat query is served from cache with no API call", async () => {
    const brave = mockEngine("brave", (q) => resp("brave", "success", [hit(`https://b/${q}`)]));
    await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave], ignoreCooldown: true });
    const out2 = await runWebSearch(["q1"], { ttlMs: TTL, engines: [brave], ignoreCooldown: true });
    expect(brave.calls).toHaveLength(1); // second run hit cache
    expect(out2.metrics.webApiCallsConsumed).toBe(0);
    expect(out2.metrics.webQueriesServedFromCache).toBe(1);
  });

  it("Edit Search reuses cached queries; only new queries call the API", async () => {
    const brave = mockEngine("brave", (q) => resp("brave", "success", [hit(`https://b/${q}`)]));
    await runWebSearch(["q1", "q2"], { ttlMs: TTL, engines: [brave], ignoreCooldown: true });
    const out2 = await runWebSearch(["q1", "q3"], { ttlMs: TTL, engines: [brave], ignoreCooldown: true });
    expect(out2.metrics.webApiCallsConsumed).toBe(1); // only q3
    expect(out2.metrics.webQueriesServedFromCache).toBe(1); // q1
    expect(brave.calls.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("normalised duplicate queries collapse to one API call", async () => {
    const brave = mockEngine("brave", (q) => resp("brave", "success", [hit(`https://b/${q}`)]));
    const out = await runWebSearch(["Foo Bar", "foo   bar"], { ttlMs: TTL, engines: [brave], ignoreCooldown: true });
    expect(out.metrics.candidateWebQueriesGenerated).toBe(1);
    expect(brave.calls).toHaveLength(1);
  });
});
