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
  // Shared contact / locality
  phone?: string;
  email?: string;
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

/** The final report streamed/returned to the client. */
export interface SearchReport {
  input: SearchInput;
  normalised: Record<string, string>;
  queries: string[];
  providers: ProviderResult[];
  candidates: Candidate[];
  /** Aggregate counts for the header/summary. */
  summary: {
    sourcesChecked: number;
    sourcesWithResults: number;
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
  | { kind: "meta"; normalised: Record<string, string>; queries: string[]; providerList: { provider: string; providerLabel: string; category: ProviderCategory }[] }
  | { kind: "provider"; result: ProviderResult }
  | { kind: "candidates"; candidates: Candidate[] }
  | { kind: "report"; report: SearchReport }
  | { kind: "fatal"; message: string };
