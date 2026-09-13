/**
 * Central, server-only configuration. Reads environment variables and reports
 * which providers are configured. Never import this into client components —
 * secrets must stay server-side (§29, §32).
 */

export interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  // Demo fixtures are OFF unless explicitly enabled. Production/default searches
  // must never silently use fixtures (R3 §2).
  demoMode: (process.env.CHECKFIRST_DEMO_MODE ?? "false").toLowerCase() === "true",
  isProduction: process.env.NODE_ENV === "production",

  google: {
    apiKey: process.env.GOOGLE_CSE_API_KEY ?? "",
    cx: process.env.GOOGLE_CSE_CX ?? "",
    get configured() {
      return Boolean(this.apiKey && this.cx);
    },
  },
  bing: {
    apiKey: process.env.BING_SEARCH_API_KEY ?? "",
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  brave: {
    apiKey: process.env.BRAVE_SEARCH_API_KEY ?? "",
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  you: {
    apiKey: process.env.YOU_SEARCH_API_KEY ?? "",
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY ?? "",
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  abr: {
    guid: process.env.ABR_GUID ?? "",
    get configured() {
      return Boolean(this.guid);
    },
  },
  hibp: {
    apiKey: process.env.HIBP_API_KEY ?? "",
    get configured() {
      return Boolean(this.apiKey);
    },
  },

  rateLimit(): RateLimitConfig {
    return {
      max: num("CHECKFIRST_RATE_LIMIT_MAX", 20),
      windowSeconds: num("CHECKFIRST_RATE_LIMIT_WINDOW_SECONDS", 60),
    };
  },

  /** Web-search router configuration (multi-provider: Brave → You.com → Tavily). */
  search: {
    /**
     * Preferred web-search engine order (SEARCH_PROVIDER_ORDER, comma-separated).
     * The first configured + enabled engine is chosen "sticky" for an
     * investigation; the rest are operational fallbacks only.
     */
    order(): string[] {
      return (process.env.SEARCH_PROVIDER_ORDER ?? "brave,you,tavily")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    },
    /** Per-engine on/off switch, e.g. YOU_SEARCH_ENABLED=false. Defaults to on. */
    enabled(id: string): boolean {
      return (process.env[`${id.toUpperCase()}_SEARCH_ENABLED`] ?? "true").toLowerCase() !== "false";
    },
    /**
     * Circuit-breaker ceiling on web queries per investigation
     * (SEARCH_QUERY_SAFETY_MAX). NOT a target — the generator produces however
     * many legitimate queries the user's input justifies, up to this cap. If the
     * cap truncates, it is logged.
     */
    querySafetyMax: num("SEARCH_QUERY_SAFETY_MAX", 12),
    /** Cache TTL (seconds) by search kind (§23). */
    cacheTtlSeconds(kind: "phone" | "email" | "person" | "business" | "website" | "news"): number {
      const map: Record<string, number> = {
        phone: 24 * 3600,
        email: 24 * 3600,
        person: 18 * 3600,
        business: 24 * 3600,
        website: 24 * 3600,
        news: 2 * 3600,
      };
      return num("SEARCH_CACHE_TTL_SECONDS", map[kind] ?? 12 * 3600);
    },
  },
};

/** Whether any web-search engine is configured (Brave, You.com or Tavily). */
export function webSearchConfigured(): boolean {
  return config.brave.configured || config.you.configured || config.tavily.configured;
}
