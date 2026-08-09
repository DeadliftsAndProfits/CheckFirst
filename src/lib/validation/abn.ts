/**
 * ABN / ACN validation using the official checksum algorithms.
 *
 * ABN (11 digits): subtract 1 from the first digit, apply weights
 * [10,1,3,5,7,9,11,13,15,17,19], sum, valid iff sum % 89 === 0.
 * ACN (9 digits): weights [8..1] over first 8 digits, complement check digit.
 */

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const ACN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 1];

export interface AbnResult {
  input: string;
  valid: boolean;
  /** 11-digit compact form. */
  abn?: string;
  /** Grouped display "12 345 678 901". */
  display?: string;
  reason?: string;
}

export interface AcnResult {
  input: string;
  valid: boolean;
  acn?: string;
  display?: string;
  reason?: string;
}

export function normaliseAbn(raw: string): AbnResult {
  const input = raw ?? "";
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return { input, valid: false, reason: "Empty ABN" };
  if (digits.length !== 11) return { input, valid: false, reason: "ABN must be 11 digits" };

  const nums = digits.split("").map(Number);
  nums[0] -= 1;
  const sum = nums.reduce((acc, n, i) => acc + n * ABN_WEIGHTS[i], 0);
  if (sum % 89 !== 0) return { input, valid: false, abn: digits, reason: "ABN checksum failed" };

  const display = `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  return { input, valid: true, abn: digits, display };
}

export function normaliseAcn(raw: string): AcnResult {
  const input = raw ?? "";
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return { input, valid: false, reason: "Empty ACN" };
  if (digits.length !== 9) return { input, valid: false, reason: "ACN must be 9 digits" };

  const nums = digits.split("").map(Number);
  const sum = ACN_WEIGHTS.reduce((acc, w, i) => acc + w * nums[i], 0);
  const complement = (10 - (sum % 10)) % 10;
  if (complement !== nums[8]) return { input, valid: false, acn: digits, reason: "ACN checksum failed" };

  const display = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  return { input, valid: true, acn: digits, display };
}

/** An ACN is embedded in an ABN: the last 9 digits of many company ABNs. */
export function acnFromAbn(abn: string): string | undefined {
  const digits = abn.replace(/[^\d]/g, "");
  if (digits.length !== 11) return undefined;
  const candidate = digits.slice(2);
  return normaliseAcn(candidate).valid ? candidate : undefined;
}
