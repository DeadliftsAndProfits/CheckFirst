/**
 * Australian-first phone normalisation.
 *
 * Goal (§9): the equivalent forms
 *   0412 345 678   +61 412 345 678   0412345678   (04) 1234 5678
 * must all correlate to the same canonical number. International numbers are
 * accepted and preserved in E.164 where possible.
 */

export interface NormalisedPhone {
  input: string;
  /** True if we could parse it into a plausible phone number. */
  valid: boolean;
  /** E.164, e.g. "+61412345678", when determinable. */
  e164?: string;
  /** Local AU form with leading 0, e.g. "0412345678", when AU. */
  national?: string;
  /** Pretty display, e.g. "0412 345 678". */
  display?: string;
  /** "mobile" | "landline" | "special" | "international" | "unknown". */
  kind: "mobile" | "landline" | "special" | "international" | "unknown";
  /** AU area/region when landline, e.g. "NSW/ACT". */
  region?: string;
  reason?: string;
}

const AREA: Record<string, string> = {
  "2": "NSW/ACT",
  "3": "VIC/TAS",
  "7": "QLD",
  "8": "SA/WA/NT",
};

/** Keep a leading + then digits only. */
function clean(raw: string): { plus: boolean; digits: string } {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return { plus, digits };
}

function group(digits: string, sizes: number[]): string {
  const out: string[] = [];
  let i = 0;
  for (const s of sizes) {
    out.push(digits.slice(i, i + s));
    i += s;
  }
  if (i < digits.length) out.push(digits.slice(i));
  return out.filter(Boolean).join(" ");
}

/** Format an AU national number (10 digits, leading 0) for display. */
function displayAu(national: string): string {
  if (/^04\d{8}$/.test(national)) return group(national, [4, 3, 3]); // 0412 345 678
  if (/^0[2378]\d{8}$/.test(national)) return group(national, [2, 4, 4]); // 02 1234 5678
  if (/^13\d{4}$/.test(national)) return group(national, [4, 2]); // 1300 xx / 13 xx handled below
  return national;
}

export function normalisePhone(raw: string): NormalisedPhone {
  const base: NormalisedPhone = { input: raw, valid: false, kind: "unknown" };
  if (!raw || !raw.trim()) return { ...base, reason: "Empty phone number" };

  const { plus, digits } = clean(raw);
  if (digits.length < 6) return { ...base, reason: "Too few digits" };
  if (digits.length > 15) return { ...base, reason: "Too many digits" };

  // Resolve to an AU national number where the input is clearly Australian.
  let national: string | undefined;
  if (plus && digits.startsWith("61")) {
    national = "0" + digits.slice(2);
  } else if (!plus && digits.startsWith("0")) {
    national = digits;
  } else if (!plus && /^1(3\d{4}|300\d{6}|800\d{6})$/.test(digits)) {
    // AU special services (13/1300/1800) have no leading zero.
    national = digits;
  } else if (!plus && digits.length === 9 && /^[2378478]/.test(digits)) {
    // Missing leading 0 (e.g. "412345678" or "212345678").
    national = "0" + digits;
  } else if (plus) {
    // Genuine international number.
    return {
      ...base,
      valid: true,
      kind: "international",
      e164: "+" + digits,
      display: "+" + group(digits, [Math.min(3, digits.length)]),
    };
  }

  if (national) {
    // AU special services: 13xxxx, 1300xxxxxx, 1800xxxxxx.
    if (/^13\d{4}$/.test(national)) {
      return { ...base, valid: true, kind: "special", national, display: group(national, [2, 2, 2]) };
    }
    if (/^1(300|800)\d{6}$/.test(national)) {
      const pretty = national.slice(0, 4) + " " + group(national.slice(4), [3, 3]);
      return { ...base, valid: true, kind: "special", national, display: pretty };
    }
    if (/^04\d{8}$/.test(national)) {
      return {
        ...base,
        valid: true,
        kind: "mobile",
        national,
        e164: "+61" + national.slice(1),
        display: displayAu(national),
      };
    }
    if (/^0[2378]\d{8}$/.test(national)) {
      return {
        ...base,
        valid: true,
        kind: "landline",
        national,
        e164: "+61" + national.slice(1),
        display: displayAu(national),
        region: AREA[national[1]],
      };
    }
    // Looks AU-ish but doesn't fit a known pattern.
    return { ...base, valid: false, national, reason: "Unrecognised Australian number pattern" };
  }

  // No leading + and not obviously AU: treat as unknown-format local digits.
  if (digits.length >= 8 && digits.length <= 11) {
    return { ...base, valid: true, kind: "unknown", national: digits, display: digits };
  }
  return { ...base, reason: "Could not interpret number" };
}

/**
 * All canonical string variants a search should look for, so that a phone typed
 * in any form correlates across sources.
 */
export function phoneVariants(raw: string): string[] {
  const n = normalisePhone(raw);
  const set = new Set<string>();
  if (n.e164) set.add(n.e164);
  if (n.national) {
    set.add(n.national);
    if (n.display) set.add(n.display);
    if (/^0/.test(n.national)) set.add("+61" + n.national.slice(1));
  }
  return [...set];
}
