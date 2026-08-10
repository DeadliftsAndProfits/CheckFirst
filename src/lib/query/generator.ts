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

/** Build the raw query strings a web-search API should run. Deduped, capped. */
export function generateQueries(input: SearchInput, n: Record<string, string>): string[] {
  const q = new Set<string>();
  const loc = [n.suburb, n.state].filter(Boolean).join(" ");
  const phoneList = contactList(n.phones, n.phone);
  const emailList = contactList(n.emails, n.email);

  switch (input.type) {
    case "person": {
      const name = n.fullName;
      if (name) {
        q.add(quote(name));
        if (loc) q.add(`${quote(name)} ${loc}`);
        if (n.employer) q.add(`${quote(name)} ${quote(n.employer)}`);
        if (n.businessName) q.add(`${quote(name)} ${quote(n.businessName)}`);
        if (n.occupation) q.add(`${quote(name)} ${n.occupation}`);
      }
      for (const e of emailList) q.add(quote(e));
      for (const p of phoneList) for (const v of phoneVariants(p)) q.add(quote(v));
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

  return [...q].slice(0, 12);
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
