/**
 * Check First — core domain types.
 *
 * These types are the contract shared by the frontend, the search orchestrator,
 * and every provider. Keeping them in one place guarantees that "what a provider
 * returns" and "what the report renders" never drift apart.
 */

/** The five consumer search modes. */
export type SearchType = "person" | "business" | "phone" | "email" | "website";

/** Raw, user-supplied search input (before normalisation). */
export interface SearchInput {
  type: SearchType;
  // Person
  firstName?: string;
  lastName?: string;
  middleName?: string;
  ageRange?: string;
  ageBand?: string;
  // Shared contact / locality
  phone?: string;
  email?: string;
  /** Multiple phone numbers (Phone tab, and any mode). Correlated together. */
  phones?: string[];
  /** Multiple email addresses (Email tab, and any mode). Correlated together. */
  emails?: string[];
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  // Person context
  employer?: string;
  occupation?: string;
  username?: string;
  // Business
  businessName?: string;
  abn?: string;
  acn?: string;
  website?: string;
}

/** Provider lifecycle statuses — these drive the live search animation. */
export type ProviderStatus =
  | "queued"
  | "searching"
  | "complete"
  | "no_results"
  | "unavailable"
  | "not_configured"
  | "error"
  | "rate_limited";

/** How authoritative a source is. */
export type SourceClass = "authoritative" | "discovery";

/**
 * Where a provider's output actually comes from — the honesty axis (R3).
 * - live: a real network query executed against the source this run.
 * - local_dataset: queried an ingested open dataset held locally.
 * - cached: real data retrieved earlier, served from cache.
 * - link: no query ran; the provider generated official-source search links.
 * - demo: in-code fixture (explicit demo mode only).
 * - none: nothing retrieved (e.g. not configured).
 */
export type DataOrigin = "live" | "local_dataset" | "cached" | "link" | "demo" | "none";

export type ProviderCategory =
  | "identity"
  | "business"
  | "licences"
  | "professional"
  | "contact"
  | "online"
  | "public_records"
  | "website"
  | "email"
  | "web";

/** A single finding returned by a provider. */
export interface ResultItem {
  /** Short human title, e.g. "ABC PLUMBING PTY LTD" or "MX record". */
  title: string;
  /** Optional supporting detail lines, already safe to render as text. */
  detail?: string;
  /** Structured key/value facts for the report (all strings, pre-encoded). */
  fields?: Record<string, string>;
  /** Link to the original/authoritative source, if any. */
  sourceUrl?: string;
  /** Where this came from and how strong it is. */
  sourceClass: SourceClass;
  /** Signals this item contributes to entity resolution (optional). */
  signals?: EntitySignal[];
  /** Marked true when produced by demo fixtures. */
  demo?: boolean;
  /** For web results: true if this result plausibly describes the searched subject. */
  matchesSubject?: boolean;
}

/**
 * A normalised signal used by the confidence engine to decide whether two
 * records describe the same entity. NOT a trustworthiness signal.
 */
export interface EntitySignal {
  kind:
    | "name"
    | "middleName"
    | "phone"
    | "email"
    | "abn"
    | "acn"
    | "business"
    | "suburb"
    | "state"
    | "postcode"
    | "employer"
    | "occupation"
    | "username"
    | "website";
  value: string;
}

/** The full result of running one provider. Matches the §22 common contract. */
export interface ProviderResult {
  provider: string;
  providerLabel: string;
  category: ProviderCategory;
  status: ProviderStatus;
  /** The exact query/lookup this provider ran (for source transparency). */
  query: string;
  /** ISO timestamp of retrieval. */
  timestamp: string;
  results: ResultItem[];
  sourceUrl?: string;
  sourceAuthority?: string;
  sourceClass: SourceClass;
  /** Where this output came from (honesty axis, R3). */
  dataOrigin: DataOrigin;
  /** Milliseconds the provider actually took to run (real timing). */
  durationMs?: number;
  warnings: string[];
  /** Present when status === "error". Human-readable, never a raw stack. */
  error?: string;
  /** ISO timestamp after which any cache of this result is stale. */
  cacheExpiry?: string;
  /** True when any result item is demo data. */
  demo?: boolean;
}

/** Evidence line shown under a candidate's confidence score. */
export interface EvidenceLine {
  /** "match" (supports), "conflict" (against), "unknown" (missing). */
  polarity: "match" | "conflict" | "unknown";
  label: string;
}

/** A resolved candidate identity/entity cluster. */
export interface Candidate {
  id: string;
  displayName: string;
  subtitle?: string;
  /** 0–100 identity-match confidence (NOT trustworthiness). */
  confidence: number;
  evidence: EvidenceLine[];
  /** Provider results grouped into this candidate. */
  resultRefs: string[];
  demo?: boolean;
}

/** One row in the synthesised identity summary (echoed input + enrichment). */
export interface IdentityField {
  label: string;
  value: string;
  /** e.g. "corroborated · 3 sources", "as provided", "from LinkedIn". */
  note?: string;
  verified?: boolean;
}

/** A best-fit identity assembled from the search input + corroborating public data. */
export interface IdentitySummary {
  headline: string;
  subtitle?: string;
  fields: IdentityField[];
  bestProfile?: { title: string; url: string; snippet?: string; platform: string };
  /** Web results that plausibly describe the searched subject. */
  matchedRefs: number;
  /** Web results that share the name but describe a different subject. */
  otherNameRefs: number;
}

/** The final report streamed/returned to the client. */
export interface SearchReport {
  input: SearchInput;
  normalised: Record<string, string>;
  queries: string[];
  providers: ProviderResult[];
  candidates: Candidate[];
  /** Best-fit identity synthesised from input + corroborating public data (R7). */
  identity?: IdentitySummary;
  /** Aggregate counts for the header/summary — honest (R3). */
  summary: {
    /** Providers that actually executed a real query (live/local/cached). */
    sourcesSearched: number;
    /** Of those, how many returned results. */
    returnedResults: number;
    /** Of those, how many genuinely found nothing. */
    noResults: number;
    unavailable: number;
    needsConfig: number;
    errored: number;
    /** Official-source links generated (not searches). */
    links: number;
    /** References found by real queries (excludes link items). */
    references: number;
    demo: boolean;
  };
  /** Non-fatal notes for the user (e.g. providers not configured). */
  notices: string[];
  startedAt: string;
  finishedAt: string;
}

/** Events streamed over NDJSON during a live search. */
export type SearchEvent =
  | {
      kind: "meta";
      normalised: Record<string, string>;
      queries: string[];
      providerList: { provider: string; providerLabel: string; category: ProviderCategory; dataOrigin: DataOrigin }[];
    }
  | { kind: "provider"; result: ProviderResult }
  | { kind: "candidates"; candidates: Candidate[] }
  | { kind: "report"; report: SearchReport }
  | { kind: "fatal"; message: string };
