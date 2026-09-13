/**
 * Identity synthesis (R7; matcher V2).
 *
 * Turns the search input into a single best-fit identity, corroborated by the
 * discovered public web results — instead of dumping a pile of links.
 *
 * Matcher V2 (candidate/investigation-level correlation):
 *  - A public profile (e.g. LinkedIn) establishes a candidate from NAME/profile
 *    evidence — WITHOUT requiring the query that found it to contain the employer.
 *  - Employer / location / other signals may be supplied by SEPARATE results or
 *    queries in the same investigation and raise confidence for that candidate.
 *  - Equivalent profile URLs across regional hosts (www./au./uk. linkedin.com/in/…)
 *    are canonicalised to ONE candidate, not several.
 *  - Matching stays conservative: name alone is never a strong match; genuine
 *    corroboration (employer/location/contact/profile metadata) drives confidence,
 *    and an employer that disagrees with the profile lowers it.
 *
 * Honesty: fields the user typed are "as provided"; only facts a public source
 * confirms are "corroborated" (text) or "corroborated · via search" (query only).
 */
import type { SearchInput, ProviderResult, ResultItem, Candidate, EvidenceLine, IdentitySummary, IdentityField } from "@/types/core";

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
  return SOCIAL.find(([d]) => h === d || h.endsWith("." + d))?.[1];
}

/**
 * Canonical profile identity across regional hosts:
 * www./au./uk./nz.linkedin.com/in/<slug> → "linkedin.com/in/<slug>".
 * Returns null for non-social URLs.
 */
function profileKey(url?: string): { key: string; platform: string } | null {
  try {
    const u = new URL(url!);
    const hn = u.hostname.replace(/^www\./, "");
    const s = SOCIAL.find(([d]) => hn === d || hn.endsWith("." + d));
    if (!s) return null;
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    if (!path || path === "") return null;
    return { key: `${s[0]}${path}`, platform: s[1] };
  } catch {
    return null;
  }
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
  return isPerson ? personIdentity(n, results) : businessIdentity(n, results);
}

// ---------------------------------------------------------------------------
// Person — candidate/investigation-level correlation.
// ---------------------------------------------------------------------------

interface Ann {
  r: ResultItem;
  text: string;
  title: string;
  auDomain: boolean;
  social?: string;
  nameInText: boolean;
  nameInTitle: boolean;
  textEmployer: boolean;
  textLoc: boolean;
  pkey?: string;
  platform?: string;
}

interface Group {
  key: string;
  platform: string;
  instances: Ann[];
  display: Ann;
  auDomain: boolean;
  textEmployer: boolean;
  textLoc: boolean;
}

function personIdentity(n: Record<string, string>, results: ResultItem[]): { candidate: Candidate; summary: IdentitySummary } {
  const headline = n.fullName;
  const lastTok = lc(n.lastName);
  const firstTok = lc(n.firstName);
  const employer = lc(n.employer);
  const suburb = lc(n.suburb);
  const state = lc(n.state);
  const locProvided = Boolean(suburb || state);

  const ann: Ann[] = results.map((r) => {
    const title = lc(r.title);
    const text = lc(`${r.title} ${r.detail ?? ""}`);
    const hn = host(r.sourceUrl);
    const social = socialName(hn);
    const pk = profileKey(r.sourceUrl);
    const nameInText = !!lastTok && text.includes(lastTok) && (!firstTok || text.includes(firstTok));
    const nameInTitle = !!lastTok && title.includes(lastTok) && (!firstTok || title.includes(firstTok));
    return {
      r,
      text,
      title,
      auDomain: hn.startsWith("au.") || hn.endsWith(".au"),
      social,
      nameInText,
      nameInTitle,
      textEmployer: !!employer && text.includes(employer),
      textLoc: (!!suburb && text.includes(suburb)) || (!!state && text.includes(state)),
      pkey: pk?.key,
      platform: pk?.platform,
    };
  });

  const nameResults = ann.filter((a) => a.nameInText);

  // A supplied value counts as corroborated ONLY when it actually appears in a
  // result/snippet for this candidate (this result or another clearly-linked one)
  // — NEVER merely because it was in the query that returned the result.
  const empTextCorr = !!employer && nameResults.some((a) => a.textEmployer);
  const locTextCorr = locProvided && nameResults.some((a) => a.textLoc);
  const empAnyCorr = empTextCorr;
  const locAnyCorr = locTextCorr;

  // Group name-matching public profiles by canonical identity (merges regional hosts).
  const groups = new Map<string, Group>();
  for (const a of ann) {
    if (!a.social || !a.nameInTitle || !a.pkey) continue;
    let g = groups.get(a.pkey);
    if (!g) {
      g = { key: a.pkey, platform: a.platform!, instances: [], display: a, auDomain: false, textEmployer: false, textLoc: false };
      groups.set(a.pkey, g);
    }
    g.instances.push(a);
    g.auDomain ||= a.auDomain;
    g.textEmployer ||= a.textEmployer;
    g.textLoc ||= a.textLoc;
    // Prefer an AU-host instance for display.
    if (a.auDomain && !g.display.auDomain) g.display = a;
  }

  // Rank candidate profiles by real corroboration (result-based signals only —
  // never the query text). A name-only profile does NOT qualify as the subject's.
  const corr = (g: Group) => (g.textEmployer ? 3 : 0) + (g.textLoc ? 2 : 0) + (g.auDomain ? 1 : 0);
  let best: Group | undefined;
  for (const g of groups.values()) {
    if (corr(g) <= 0) continue; // name-only profile → not confidently the subject
    if (!best || corr(g) > corr(best) || (corr(g) === corr(best) && g.auDomain && !best.auDomain)) best = g;
  }

  const bestProfile: IdentitySummary["bestProfile"] | undefined = best
    ? { title: best.display.r.title, url: best.display.r.sourceUrl!, snippet: best.display.r.detail, platform: best.platform }
    : undefined;

  // Role + employer-conflict from the best profile's title ("Name - Role - Company | LinkedIn").
  let role = n.occupation;
  let employerConflict = false;
  if (bestProfile) {
    const clean = bestProfile.title.replace(/\s*\|\s*linkedin.*$/i, "");
    const parts = clean.split(/\s[-|·–—]\s/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) role = parts.slice(1).join(" · ").slice(0, 90);
    // A clearly-parsed trailing company that disagrees with a provided-but-uncorroborated employer.
    if (employer && !empAnyCorr && parts.length >= 3) {
      const company = lc(parts[parts.length - 1]);
      if (company && company.length <= 40 && !company.includes(employer) && !employer.includes(company)) employerConflict = true;
    }
  }

  // Matched vs "other people with this name".
  const matched: ResultItem[] = [];
  const others: ResultItem[] = [];
  for (const a of ann) {
    const inBest = !!best && a.pkey === best.key;
    const corroborates = a.nameInText && (a.textEmployer || a.textLoc);
    if (inBest || corroborates) {
      a.r.matchesSubject = true;
      matched.push(a.r);
    } else {
      a.r.matchesSubject = false;
      others.push(a.r);
    }
  }

  // Contact signals appearing in matched results (extra corroboration).
  const contactHit =
    (!!n.email && nameResults.some((a) => a.text.includes(lc(n.email)))) ||
    (!!n.username && nameResults.some((a) => a.text.includes(lc(n.username))));

  // ---- confidence + evidence ----
  const ev: EvidenceLine[] = [];
  let score = 30;
  ev.push({ polarity: "match", label: "Name as provided" });
  if (bestProfile) {
    score += 20;
    ev.push({ polarity: "match", label: `${bestProfile.platform} profile matches the name` });
    if (best!.auDomain) score += 8;
  } else if (matched.length) {
    score += 12;
    ev.push({ polarity: "match", label: `${matched.length} public source${matched.length > 1 ? "s" : ""} corroborate this identity` });
  }
  if (employer) {
    if (empTextCorr) {
      score += 20;
      ev.push({ polarity: "match", label: `Employer “${n.employer}” corroborated in a public source` });
    } else if (employerConflict) {
      score -= 12;
      ev.push({ polarity: "conflict", label: `Profile lists a different employer than “${n.employer}”` });
    } else {
      ev.push({ polarity: "unknown", label: "Employer not independently corroborated" });
    }
  }
  if (locProvided) {
    if (locTextCorr) {
      score += 12;
      ev.push({ polarity: "match", label: `Location ${[n.suburb, n.state].filter(Boolean).join(" ")} corroborated in a public source` });
    } else {
      ev.push({ polarity: "unknown", label: `Location ${[n.suburb, n.state].filter(Boolean).join(" ")} (as provided)` });
    }
  }
  if (contactHit) {
    score += 6;
    ev.push({ polarity: "match", label: "A supplied contact detail appears alongside this identity" });
  }
  if (n.ageBand) ev.push({ polarity: "unknown", label: `Approx. age ${n.ageBand} (as provided)` });
  // Extra distinct corroborating sources (beyond the profile itself).
  score += Math.min(10, Math.max(0, matched.length - 1) * 4);
  // Conservative cap: a profile with NO employer/location corroboration (name + AU
  // presence only) surfaces as a possible — never a highly-confident — match (§5).
  if (bestProfile && !empAnyCorr && !locAnyCorr) score = Math.min(score, 55);
  if (!bestProfile && matched.length === 0) score = 22;
  score = clamp(score);

  // ---- identity fields (echo the search + enrich) ----
  const empNote = empTextCorr ? "corroborated" : employerConflict ? "conflicts with profile" : "as provided";
  const locNote = locTextCorr ? "corroborated" : "as provided";
  const fields: IdentityField[] = [];
  const nameNote = matched.length ? `corroborated · ${matched.length} source${matched.length > 1 ? "s" : ""}` : "as provided";
  fields.push({ label: "Full name", value: headline, note: nameNote, verified: matched.length > 0 });
  if (role) fields.push({ label: "Role / occupation", value: role, note: bestProfile ? `from ${bestProfile.platform}` : "as provided", verified: !!bestProfile });
  if (n.employer) fields.push({ label: "Employer", value: n.employer, note: empNote, verified: empAnyCorr });
  if (n.suburb || n.state) fields.push({ label: "Location", value: [n.suburb, n.state].filter(Boolean).join(" ") || n.state, note: locNote, verified: locAnyCorr });
  if (n.ageBand) fields.push({ label: "Approx. age", value: n.ageBand, note: "as provided" });
  if (n.phone) fields.push({ label: "Phone", value: n.phone, note: "as provided" });
  if (n.email) fields.push({ label: "Email", value: n.email, note: "as provided" });
  if (n.username) fields.push({ label: "Username", value: n.username, note: "as provided" });
  if (n.middleName) fields.push({ label: "Middle name", value: n.middleName, note: "as provided" });

  const subtitle = [[n.suburb, n.state].filter(Boolean).join(" "), n.employer].filter(Boolean).join(" · ") || undefined;
  const candidate: Candidate = {
    id: "primary",
    displayName: headline,
    subtitle,
    confidence: score,
    evidence: ev,
    resultRefs: bestProfile ? [bestProfile.url] : [],
  };
  const summary: IdentitySummary = { headline, subtitle, fields, bestProfile, matchedRefs: matched.length, otherNameRefs: others.length };
  return { candidate, summary };
}

// ---------------------------------------------------------------------------
// Business — unchanged behaviour (matcher V2 scope is Person only).
// ---------------------------------------------------------------------------

function businessIdentity(n: Record<string, string>, results: ResultItem[]): { candidate: Candidate; summary: IdentitySummary } {
  const headline = n.businessName;
  const lastTok = lc((n.businessName || "").split(/\s+/)[0]);
  const bizName = lc(n.businessName);
  const suburb = lc(n.suburb);
  const state = lc(n.state);

  const matches: ResultItem[] = [];
  const others: ResultItem[] = [];
  let bestProfile: IdentitySummary["bestProfile"] | undefined;

  for (const r of results) {
    const title = lc(r.title);
    const text = lc(`${r.title} ${r.detail ?? ""}`);
    const hn = host(r.sourceUrl);
    if (!lastTok || !text.includes(lastTok)) {
      r.matchesSubject = false;
      others.push(r);
      continue;
    }
    const social = socialName(hn);
    const auDomain = hn.startsWith("au.") || hn.endsWith(".au");
    const textLoc = (!!suburb && text.includes(suburb)) || (!!state && text.includes(state));
    const nameInTitle = title.includes(lastTok);
    const hasBiz = !!bizName && text.includes(bizName);
    if (hasBiz) {
      r.matchesSubject = true;
      matches.push(r);
      if (social && nameInTitle && !bestProfile && (auDomain || textLoc)) {
        bestProfile = { title: r.title, url: r.sourceUrl!, snippet: r.detail, platform: social };
      }
    } else {
      r.matchesSubject = false;
      others.push(r);
    }
  }

  const ev: EvidenceLine[] = [];
  let score = 34;
  ev.push({ polarity: "match", label: "Business name as provided" });
  if (bestProfile) {
    score += 34;
    ev.push({ polarity: "match", label: `${bestProfile.platform} profile corroborates the business` });
  } else if (matches.length) {
    score += 14;
    ev.push({ polarity: "match", label: `${matches.length} public source${matches.length > 1 ? "s" : ""} corroborate this business` });
  }
  if (suburb || state) {
    score += 8;
    ev.push({ polarity: "match", label: `Location ${[n.suburb, n.state].filter(Boolean).join(" ")} (as provided)` });
  }
  score = clamp(score + Math.min(16, Math.max(0, matches.length - 1) * 4));
  if (!bestProfile && matches.length === 0) score = clamp(26);

  const fields: IdentityField[] = [];
  const nameNote = matches.length ? `corroborated · ${matches.length} source${matches.length > 1 ? "s" : ""}` : "as provided";
  fields.push({ label: "Business name", value: headline, note: nameNote, verified: matches.length > 0 });
  if (n.abn) fields.push({ label: "ABN", value: n.abn, note: "as provided" });
  if (n.acn) fields.push({ label: "ACN", value: n.acn, note: "as provided" });
  if (n.suburb || n.state) fields.push({ label: "State", value: [n.suburb, n.state].filter(Boolean).join(" ") || n.state, note: "as provided" });
  if (n.website || n.domain) fields.push({ label: "Website", value: n.domain || n.website, note: "as provided" });

  const subtitle = [[n.suburb, n.state].filter(Boolean).join(" "), n.abn ? `ABN ${n.abn}` : ""].filter(Boolean).join(" · ") || undefined;
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
