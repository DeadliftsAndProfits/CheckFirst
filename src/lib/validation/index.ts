/**
 * Whole-input validation & normalisation for a SearchInput.
 *
 * Returns per-field errors (for the form), a flat normalised map (for the
 * report's "what we searched" panel and source transparency), and the set of
 * entity signals the confidence engine will use.
 */
import type { SearchInput, EntitySignal } from "@/types/core";
import { normalisePhone } from "./phone";
import { normaliseEmail } from "./email";
import { normaliseAbn, normaliseAcn } from "./abn";
import { normaliseUrl } from "./url";
import { normaliseName, normaliseText, normaliseState, normalisePostcode, comparisonKey } from "./name";

export * from "./phone";
export * from "./email";
export * from "./abn";
export * from "./url";
export * from "./name";

export interface ValidationOutput {
  ok: boolean;
  errors: Record<string, string>;
  normalised: Record<string, string>;
  signals: EntitySignal[];
}

function add(signals: EntitySignal[], kind: EntitySignal["kind"], value?: string) {
  if (value) signals.push({ kind, value });
}

export function validateAndNormalise(input: SearchInput): ValidationOutput {
  const errors: Record<string, string> = {};
  const normalised: Record<string, string> = {};
  const signals: EntitySignal[] = [];

  // Optional shared fields (used by several modes).
  const applyOptional = () => {
    if (input.phone) {
      const p = normalisePhone(input.phone);
      if (!p.valid) errors.phone = p.reason ?? "Invalid phone";
      else {
        normalised.phone = p.display ?? p.national ?? p.e164 ?? input.phone;
        add(signals, "phone", p.e164 ?? p.national);
      }
    }
    if (input.email) {
      const e = normaliseEmail(input.email);
      if (!e.valid) errors.email = e.reason ?? "Invalid email";
      else {
        normalised.email = e.normalised!;
        add(signals, "email", e.normalised);
      }
    }
    if (input.abn) {
      const a = normaliseAbn(input.abn);
      if (!a.valid) errors.abn = a.reason ?? "Invalid ABN";
      else {
        normalised.abn = a.display!;
        add(signals, "abn", a.abn);
      }
    }
    if (input.acn) {
      const a = normaliseAcn(input.acn);
      if (!a.valid) errors.acn = a.reason ?? "Invalid ACN";
      else {
        normalised.acn = a.display!;
        add(signals, "acn", a.acn);
      }
    }
    if (input.website) {
      const w = normaliseUrl(input.website);
      if (!w.valid) errors.website = w.reason ?? "Invalid website";
      else {
        normalised.website = w.hostname!;
        add(signals, "website", w.hostname);
      }
    }
    for (const [field, kind] of [
      ["employer", "employer"],
      ["occupation", "occupation"],
      ["businessName", "business"],
      ["suburb", "suburb"],
      ["address", null],
    ] as const) {
      const raw = (input as unknown as Record<string, string | undefined>)[field];
      if (raw) {
        const t = normaliseText(raw);
        if (!t.valid) errors[field] = t.reason ?? "Invalid";
        else {
          normalised[field] = t.value!;
          if (kind) add(signals, kind, comparisonKey(t.value!));
        }
      }
    }
    if (input.state) {
      const s = normaliseState(input.state);
      if (!s) errors.state = "Unknown state";
      else {
        normalised.state = s;
        add(signals, "state", s);
      }
    }
    if (input.postcode) {
      const pc = normalisePostcode(input.postcode);
      if (!pc) errors.postcode = "Postcode must be 4 digits";
      else {
        normalised.postcode = pc;
        add(signals, "postcode", pc);
      }
    }
    if (input.username) {
      const t = normaliseText(input.username, 60);
      if (!t.valid) errors.username = "Invalid username";
      else {
        normalised.username = t.value!;
        add(signals, "username", t.value!.toLowerCase());
      }
    }
    if (input.middleName) {
      const n = normaliseName(input.middleName);
      if (!n.valid) errors.middleName = n.reason ?? "Invalid middle name";
      else {
        normalised.middleName = n.display!;
        add(signals, "middleName", n.key);
      }
    }
    if (input.ageRange) normalised.ageRange = input.ageRange.trim();
  };

  switch (input.type) {
    case "person": {
      const first = normaliseName(input.firstName ?? "");
      const last = normaliseName(input.lastName ?? "");
      if (!first.valid) errors.firstName = first.reason ?? "First name required";
      if (!last.valid) errors.lastName = last.reason ?? "Last name required";
      if (first.valid && last.valid) {
        normalised.firstName = first.display!;
        normalised.lastName = last.display!;
        normalised.fullName = `${first.display} ${last.display}`;
        add(signals, "name", `${first.key} ${last.key}`);
      }
      applyOptional();
      break;
    }
    case "business": {
      applyOptional();
      const hasAnything =
        normalised.businessName ||
        normalised.abn ||
        normalised.acn ||
        normalised.phone ||
        normalised.email ||
        normalised.website;
      if (!hasAnything && !errors.businessName) {
        errors.businessName = "Enter a business name, ABN, ACN, phone, email or website";
      }
      break;
    }
    case "phone": {
      const p = normalisePhone(input.phone ?? "");
      if (!p.valid) errors.phone = p.reason ?? "Enter a valid phone number";
      else {
        normalised.phone = p.display ?? p.national ?? p.e164!;
        if (p.e164) normalised.phoneE164 = p.e164;
        if (p.region) normalised.region = p.region;
        normalised.phoneKind = p.kind;
        add(signals, "phone", p.e164 ?? p.national);
      }
      break;
    }
    case "email": {
      const e = normaliseEmail(input.email ?? "");
      if (!e.valid) errors.email = e.reason ?? "Enter a valid email";
      else {
        normalised.email = e.normalised!;
        normalised.emailDomain = e.domain!;
        add(signals, "email", e.normalised);
      }
      break;
    }
    case "website": {
      const w = normaliseUrl(input.website ?? "");
      if (!w.valid) errors.website = w.reason ?? "Enter a valid website";
      else {
        normalised.website = w.hostname!;
        normalised.origin = w.origin!;
        normalised.domain = w.domain!;
        add(signals, "website", w.hostname);
      }
      break;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, normalised, signals };
}
