/**
 * Identity synthesis (R7).
 *
 * Turns the search input into a single best-fit identity, corroborated by the
 * discovered public web results — instead of dumping a pile of links. It:
 *  - echoes the details the user provided (name, employer, location, phone…),
 *  - decides which web results actually describe THIS subject (name + employer/
 *    location) vs different people who merely share the name,
 *  - picks the strongest public profile (e.g. the LinkedIn that matches name +
 *    employer) and extracts a role from it,
 *  - scores identity confidence from genuine corroboration.
 *
 * This is honest: fields the user typed are labelled "as provided"; only facts
 * a public source actually confirms are labelled "corroborated".
 */
import type { SearchInput, ProviderResult, Candidate, EvidenceLine, IdentitySummary, IdentityField } from "@/types/core";

const SOCIAL: [string, string][] = [
  ["linkedin.com", "LinkedIn"],
  ["facebook.com", "Facebook"],
  ["instagram.com", "Instagram"],
  ["x.com", "X"],
  ["twitter.com", "X"],
  ["github.com", "GitHub"],
  ["youtube.com", "YouTube"],
  ["tiktok.com", "TikTok"],
];

const lc = (s?: string) => (s ?? "").toLowerCase();
const clamp = (n: number) => Math.max(5, Math.min(95, Math.round(n)));

function host(u?: string): string {
  try {
    return new URL(u!).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function socialName(h: string): string | undefined {
  const s = SOCIAL.find(([d]) => h === d || h.endsWith("." + d));
  return s?.[1];
}

export function buildIdentity(
  input: SearchInput,
  n: Record<string, string>,
  providers: ProviderResult[],
): { candidate: Candidate; summary: IdentitySummary } | null {
  const isPerson = input.type === "person";
  const isBusiness = input.type === "business";
  if (!isPerson && !isBusiness) return null;

  const headline = isPerson ? n.fullName : n.businessName;
  if (!headline) return null;

  const web = providers.find((p) => p.category === "web" && p.status === "complete");
  const results = web?.results ?? [];

  const lastTok = isPerson ? lc(n.lastName) : lc((n.businessName || "").split(/\s+/)[0]);
  const firstTok = isPerson ? lc(n.firstName) : "";
  const employer = lc(n.employer);
  const bizName = lc(n.businessName);
  const suburb = lc(n.suburb);
  const state = lc(n.state);

  const matches: ProviderResult["results"] = [];
  const others: ProviderResult["results"] = [];
  let bestProfile: IdentitySummary["bestProfile"] | undefined;

  for (const r of results) {
    const title = lc(r.title);
    const text = lc(`${r.title} ${r.detail ?? ""}`);
    const q = lc(r.fields?.Query ?? "");
    const hn = host(r.sourceUrl);
    if (!lastTok || !text.includes(lastTok)) {
      r.matchesSubject = false;
      others.push(r);
      continue;
    }
    const social = socialName(hn);
    // Australian domain (au.linkedin.com, *.com.au, *.au) — this is an AU-first product.
    const auDomain = hn.startsWith("au.") || hn.endsWith(".au");
    const textEmployer = isPerson && !!employer && text.includes(employer);
    const textLoc = (!!suburb && text.includes(suburb)) || (!!state && text.includes(state));
    const nameInTitle = title.includes(lastTok) && (!firstTok || title.includes(firstTok));
    const employerQueryOk = employer ? q.includes(employer) : true;
    const hasBiz = isBusiness && !!bizName && text.includes(bizName);
    // "This subject" only if the employer/location is in the actual result text,
    // OR it's a name-matching AU public profile from the employer query (real
    // profiles often hide the employer from the search snippet).
    const strong = isPerson ? textEmployer || textLoc || (!!social && nameInTitle && auDomain && employerQueryOk) : hasBiz;

    if (strong) {
      r.matchesSubject = true;
      matches.push(r);
      if (social && nameInTitle && !bestProfile && (auDomain || textEmployer || textLoc)) {
        bestProfile = { title: r.title, url: r.sourceUrl!, snippet: r.detail, platform: social };
      }
    } else {
      r.matchesSubject = false;
      others.push(r);
    }
  }

  const employerCorroborated = isPerson && !!employer && matches.some((r) => lc(`${r.title} ${r.detail ?? ""}`).includes(employer));

  // Extract a role from the best profile's title ("Name - Role | Company").
  let role = n.occupation;
  if (isPerson && bestProfile) {
    const parts = bestProfile.title.split(/\s[-|·–—]\s/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) role = parts.slice(1).join(" · ").replace(/\|.*$/, "").trim().slice(0, 90);
  }

  // ---- confidence + evidence ----
  const ev: EvidenceLine[] = [];
  let score = isPerson ? 30 : 34;
  ev.push({ polarity: "match", label: isPerson ? "Name as provided" : "Business name as provided" });
  if (bestProfile) {
    score += 34;
    ev.push({ polarity: "match", label: `${bestProfile.platform} profile corroborates the ${isPerson ? "name" : "business"}${isPerson && employerCorroborated ? " + employer" : ""}` });
  } else if (matches.length) {
    score += 14;
    ev.push({ polarity: "match", label: `${matches.length} public source${matches.length > 1 ? "s" : ""} corroborate this ${isPerson ? "identity" : "business"}` });
  }
  if (isPerson && employer) {
    if (employerCorroborated) {
      score += 12;
      ev.push({ polarity: "match", label: `Employer “${n.employer}” corroborated online` });
    } else {
      ev.push({ polarity: "unknown", label: "Employer not yet corroborated" });
    }
  }
  if (suburb || state) {
    score += 8;
    ev.push({ polarity: "match", label: `Location ${[n.suburb, n.state].filter(Boolean).join(" ")} (as provided)` });
  }
  if (isPerson && n.ageBand) ev.push({ polarity: "unknown", label: `Approx. age ${n.ageBand} (as provided)` });
  score = clamp(score + Math.min(16, Math.max(0, matches.length - 1) * 4));
  if (!bestProfile && matches.length === 0) score = clamp(isPerson ? 22 : 26);

  // ---- identity fields (echo the search + enrich) ----
  const fields: IdentityField[] = [];
  const nameNote = matches.length ? `corroborated · ${matches.length} source${matches.length > 1 ? "s" : ""}` : "as provided";
  fields.push({ label: isPerson ? "Full name" : "Business name", value: headline, note: nameNote, verified: matches.length > 0 });
  if (isPerson && role) fields.push({ label: "Role / occupation", value: role, note: bestProfile ? `from ${bestProfile.platform}` : "as provided", verified: !!bestProfile });
  if (isPerson && n.employer) fields.push({ label: "Employer", value: n.employer, note: employerCorroborated ? "corroborated" : "as provided", verified: employerCorroborated });
  if (isBusiness && n.abn) fields.push({ label: "ABN", value: n.abn, note: "as provided" });
  if (isBusiness && n.acn) fields.push({ label: "ACN", value: n.acn, note: "as provided" });
  if (n.suburb || n.state) fields.push({ label: isPerson ? "Location" : "State", value: [n.suburb, n.state].filter(Boolean).join(" ") || n.state, note: "as provided" });
  if (isPerson && n.ageBand) fields.push({ label: "Approx. age", value: n.ageBand, note: "as provided" });
  if (n.phone) fields.push({ label: "Phone", value: n.phone, note: "as provided" });
  if (n.email) fields.push({ label: "Email", value: n.email, note: "as provided" });
  if (n.website || n.domain) fields.push({ label: "Website", value: n.domain || n.website, note: "as provided" });
  if (n.middleName) fields.push({ label: "Middle name", value: n.middleName, note: "as provided" });

  const subtitle = [[n.suburb, n.state].filter(Boolean).join(" "), isPerson ? n.employer : n.abn ? `ABN ${n.abn}` : ""].filter(Boolean).join(" · ") || undefined;

  const candidate: Candidate = {
    id: "primary",
    displayName: headline,
    subtitle,
    confidence: score,
    evidence: ev,
    resultRefs: bestProfile ? [bestProfile.url] : [],
  };
  const summary: IdentitySummary = { headline, subtitle, fields, bestProfile, matchedRefs: matches.length, otherNameRefs: others.length };
  return { candidate, summary };
}
