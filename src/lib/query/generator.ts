/**
 * Query generation service (§18).
 *
 * Given what the user knows, produce a small set of high-value, targeted search
 * queries (not hundreds of low-value ones) plus legitimate "open this search"
 * discovery links to public sites. We never bypass any site's access controls;
 * discovery links simply pre-fill a public search.
 */
import type { SearchInput } from "@/types/core";
import { phoneVariants } from "@/lib/validation/phone";
import { config } from "@/lib/config";

export interface DiscoveryLink {
  label: string;
  url: string;
  group: "search" | "social" | "directory" | "records";
}

const SOCIAL_SITES: { site: string; label: string }[] = [
  { site: "linkedin.com/in", label: "LinkedIn" },
  { site: "facebook.com", label: "Facebook" },
  { site: "instagram.com", label: "Instagram" },
  { site: "x.com", label: "X (Twitter)" },
  { site: "reddit.com", label: "Reddit" },
  { site: "github.com", label: "GitHub" },
  { site: "tiktok.com", label: "TikTok" },
  { site: "youtube.com", label: "YouTube" },
];

function quote(s: string): string {
  return `"${s.replace(/"/g, "")}"`;
}

/** Google search URL for an arbitrary query (public, no auth). */
export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function contactList(joined?: string, single?: string): string[] {
  return (joined ?? single ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One logical Person search signal and the physical web queries it compiles to. */
export interface QuerySignal {
  id: string;
  kind: "employer" | "location" | "linkedin" | "name" | "email" | "username" | "phone";
  label: string;
  queries: string[];
}

/**
 * Person web sub-query strategy (V2). Each signal tests a materially distinct
 * claim; semantic duplicates are removed; genuinely different exact textual
 * representations (phone) are preserved.
 *
 * Phone note (§9): Brave's Boolean `OR` was empirically shown to DESTROY results
 * for quoted numeric phrases (e.g. bare digits = 10 hits, OR-combined = 0), so we
 * run the three canonical representations as SEPARATE exact queries on every
 * engine — one logical phone signal → three physical queries.
 */
export function personSignals(n: Record<string, string>): QuerySignal[] {
  const signals: QuerySignal[] = [];
  const name = n.fullName;
  if (!name) return signals;
  const nameQ = quote(name);
  const context = n.employer || n.businessName || n.occupation; // professional corroboration
  const state = n.state;
  const loc = [n.suburb, n.state].filter(Boolean).join(" ");
  const hasStrongContext = Boolean(context) || Boolean(loc);
  const emailList = contactList(n.emails, n.email);
  const phoneList = contactList(n.phones, n.phone);

  // §1 Name ↔ employer/context — one strong combined query (not multiple syntactic forms).
  if (context) {
    const q = state ? `${nameQ} ${quote(context)} ${state}` : `${nameQ} ${quote(context)}`;
    signals.push({ id: "employer", kind: "employer", label: `name + context${state ? " + state" : ""}`, queries: [q] });
  }
  // §2 Name ↔ location — an independent claim, so a separate query.
  if (loc) signals.push({ id: "location", kind: "location", label: "name + location", queries: [`${nameQ} ${loc}`] });
  // §3 LinkedIn — one query using the strongest context available.
  const li = context
    ? `${nameQ} ${quote(context)} site:linkedin.com`
    : loc
      ? `${nameQ} ${loc} site:linkedin.com`
      : `${nameQ} site:linkedin.com`;
  signals.push({ id: "linkedin", kind: "linkedin", label: "LinkedIn", queries: [li] });
  // §4 Bare name — fallback ONLY when no stronger context exists.
  if (!hasStrongContext) signals.push({ id: "name", kind: "name", label: "bare name", queries: [nameQ] });
  // §5 Email — the exact address only (no derived local-part/handle search).
  for (const e of emailList) signals.push({ id: `email:${e}`, kind: "email", label: `email ${e}`, queries: [quote(e)] });
  // §6 Username — exact.
  if (n.username) signals.push({ id: "username", kind: "username", label: `username ${n.username}`, queries: [quote(n.username)] });
  // §7 Phone — one logical signal, three exact representations, run separately (see note above).
  for (const p of phoneList) {
    const variants = phoneVariants(p);
    if (variants.length) signals.push({ id: `phone:${p}`, kind: "phone", label: `phone ${p}`, queries: variants.map(quote) });
  }
  return signals;
}

/** Build the raw query strings a web-search API should run. Deduped, capped. */
export function generateQueries(input: SearchInput, n: Record<string, string>): string[] {
  const q = new Set<string>();
  const loc = [n.suburb, n.state].filter(Boolean).join(" ");
  const phoneList = contactList(n.phones, n.phone);
  const emailList = contactList(n.emails, n.email);

  switch (input.type) {
    case "person": {
      // Person strategy V2: distinct claims → distinct queries, no syntactic
      // duplicates (see personSignals above).
      for (const s of personSignals(n)) for (const query of s.queries) q.add(query);
      break;
    }
    case "business": {
      const bn = n.businessName;
      if (bn) {
        q.add(quote(bn));
        q.add(`${quote(bn)} ABN`);
        if (loc) q.add(`${quote(bn)} ${loc}`);
        q.add(`${quote(bn)} reviews`);
      }
      if (n.abn) q.add(`${quote(n.abn)} ABN`);
      if (n.website) q.add(quote(n.website));
      for (const e of emailList) q.add(quote(e));
      for (const p of phoneList) for (const v of phoneVariants(p)) q.add(quote(v));
      break;
    }
    case "phone": {
      for (const p of phoneList) for (const v of phoneVariants(p)) q.add(quote(v));
      break;
    }
    case "email": {
      for (const e of emailList) {
        q.add(quote(e));
        const handle = e.split("@")[0];
        if (handle && handle.length > 2) q.add(quote(handle));
      }
      break;
    }
    case "website": {
      if (n.domain) {
        q.add(quote(n.domain));
        q.add(`${quote(n.domain)} ABN`);
        q.add(`${quote(n.domain)} reviews`);
      }
      break;
    }
  }

  // The query count is driven by the user's distinct signals — NOT a target.
  // SEARCH_QUERY_SAFETY_MAX is only a circuit breaker against runaway/malformed
  // input; if it ever truncates, we log exactly what was dropped (§3, §42).
  const list = [...q];
  const max = config.search.querySafetyMax;
  if (list.length > max) {
    console.warn(`[websearch] query ceiling reached: generated ${list.length}, capping to SEARCH_QUERY_SAFETY_MAX=${max}`, {
      type: input.type,
      dropped: list.slice(max),
    });
    return list.slice(0, max);
  }
  return list;
}

/** Build public discovery links the consumer can open in one click. */
export function generateDiscoveryLinks(input: SearchInput, n: Record<string, string>): DiscoveryLink[] {
  const links: DiscoveryLink[] = [];
  const name = n.fullName;
  const primary = name || n.businessName || n.email || n.phone || n.domain || "";

  // General web search for the strongest identifier.
  if (primary) {
    links.push({ label: "Web search", url: googleSearchUrl(quote(primary)), group: "search" });
  }

  // Social discovery via public site: searches (never scraping behind auth).
  const subject = name || n.username || n.businessName;
  if (subject) {
    for (const s of SOCIAL_SITES) {
      links.push({
        label: s.label,
        url: googleSearchUrl(`${quote(subject)} site:${s.site}`),
        group: "social",
      });
    }
  }

  // Directory / records discovery for people & businesses.
  if (input.type === "person" || input.type === "business") {
    const who = name || n.businessName || "";
    const loc = [n.suburb, n.state].filter(Boolean).join(" ");
    if (who) {
      links.push({
        label: "White Pages / directories",
        url: googleSearchUrl(`${quote(who)} ${loc} (site:whitepages.com.au OR site:yellowpages.com.au OR site:truelocal.com.au)`),
        group: "directory",
      });
      links.push({
        label: "Court & tribunal decisions (AustLII)",
        url: `https://www.austlii.edu.au/cgi-bin/sinosrch.cgi?query=${encodeURIComponent(who)}`,
        group: "records",
      });
    }
  }

  return links;
}
