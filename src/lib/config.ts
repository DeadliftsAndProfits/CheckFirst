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
};

/** Whether any web-search provider is configured (Google or Bing). */
export function webSearchConfigured(): boolean {
  return config.google.configured || config.bing.configured;
}
