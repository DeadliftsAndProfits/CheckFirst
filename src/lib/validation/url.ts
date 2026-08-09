/**
 * URL / domain normalisation for the Website search mode.
 *
 * Accepts a bare domain ("example.com.au"), a host with path, or a full URL,
 * and returns a canonical https origin plus the registrable hostname. Rejects
 * obviously invalid hosts. SSRF safety (blocking private/loopback targets) is a
 * separate concern handled in lib/security/ssrf.ts at fetch time.
 */

export interface NormalisedUrl {
  input: string;
  valid: boolean;
  /** Lowercased hostname, e.g. "example.com.au". */
  hostname?: string;
  /** Canonical origin, e.g. "https://example.com.au". */
  origin?: string;
  /** Full canonical URL including path when supplied. */
  href?: string;
  /** Apex/registrable-ish domain (best-effort, includes AU multi-part TLDs). */
  domain?: string;
  reason?: string;
}

// Hostnames: labels of a-z0-9 and hyphens, at least one dot, valid TLD.
const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const AU_SECOND_LEVEL = new Set([
  "com",
  "net",
  "org",
  "edu",
  "gov",
  "asn",
  "id",
  "au", // for e.g. qld.gov.au handled generically below
]);

/** Best-effort registrable domain, aware of AU multi-part suffixes. */
export function registrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  if (last === "au" && AU_SECOND_LEVEL.has(secondLast)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

export function normaliseUrl(raw: string): NormalisedUrl {
  const input = raw ?? "";
  const trimmed = input.trim();
  if (!trimmed) return { input, valid: false, reason: "Empty website" };
  if (trimmed.length > 2000) return { input, valid: false, reason: "URL too long" };

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    // Strip a leading scheme-less "//", and any stray user input.
    candidate = "https://" + candidate.replace(/^\/+/, "");
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return { input, valid: false, reason: "Not a valid URL" };
  }

  const hostname = u.hostname.toLowerCase();
  if (!HOST_RE.test(hostname)) {
    return { input, valid: false, reason: "Not a valid hostname" };
  }
  // Reject bare Ithan-less single labels and pure IPs here (IPs handled by SSRF).
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return { input, valid: false, reason: "Enter a domain name, not an IP address" };
  }

  const origin = `https://${hostname}`;
  const path = u.pathname === "/" && !u.search ? "" : u.pathname + u.search;
  return {
    input,
    valid: true,
    hostname,
    origin,
    href: origin + path,
    domain: registrableDomain(hostname),
  };
}
