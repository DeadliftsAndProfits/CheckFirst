/**
 * Email validation & normalisation.
 *
 * We validate structurally (not by sending mail) and normalise conservatively:
 * lowercase the domain always; lowercase the local-part (safe for the vast
 * majority of real-world providers). We do NOT apply provider-specific rules
 * like Gmail dot-stripping — that would risk conflating distinct addresses.
 */

export interface NormalisedEmail {
  input: string;
  valid: boolean;
  normalised?: string;
  localPart?: string;
  domain?: string;
  reason?: string;
}

// Pragmatic RFC-5322-ish pattern: good enough to reject junk, not so strict it
// rejects valid addresses. Full RFC compliance is not useful here.
const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function normaliseEmail(raw: string): NormalisedEmail {
  const input = raw ?? "";
  const trimmed = input.trim();
  if (!trimmed) return { input, valid: false, reason: "Empty email" };
  if (trimmed.length > 254) return { input, valid: false, reason: "Email too long" };
  if (!EMAIL_RE.test(trimmed)) return { input, valid: false, reason: "Not a valid email format" };

  const at = trimmed.lastIndexOf("@");
  const localPart = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (localPart.length > 64) return { input, valid: false, reason: "Local part too long" };

  const normalised = `${localPart.toLowerCase()}@${domain}`;
  return { input, valid: true, normalised, localPart: localPart.toLowerCase(), domain };
}

export function emailDomain(raw: string): string | undefined {
  return normaliseEmail(raw).domain;
}
