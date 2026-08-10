/**
 * Whole-input validation & normalisation for a SearchInput.
 *
 * Returns per-field errors (for the form), a flat normalised map (for the
 * report's "what we searched" panel and source transparency), and the set of
 * entity signals the confidence engine will use.
 *
 * Round 2: supports multiple phones (`phones[]`) and emails (`emails[]`) in any
 * mode, plus an approximate `ageBand`. Singular `phone`/`email` remain supported
 * for backwards compatibility and are merged into the arrays.
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

const MAX_CONTACTS = 5;

function add(signals: EntitySignal[], kind: EntitySignal["kind"], value?: string) {
  if (value) signals.push({ kind, value });
}

/** Merge singular + array contact fields, trim, drop blanks, cap, dedupe. */
function mergeContacts(singular?: string, array?: string[]): string[] {
  const all = [singular ?? "", ...(array ?? [])].map((s) => (s ?? "").trim()).filter(Boolean);
  return [...new Set(all)].slice(0, MAX_CONTACTS);
}

export function validateAndNormalise(input: SearchInput): ValidationOutput {
  const errors: Record<string, string> = {};
  const normalised: Record<string, string> = {};
  const signals: EntitySignal[] = [];

  const phones = mergeContacts(input.phone, input.phones);
  const emails = mergeContacts(input.email, input.emails);

  /** Normalise every supplied phone; record signals; report invalids. */
  const processPhones = (required: boolean) => {
    const displays: string[] = [];
    let firstE164: string | undefined;
    let anyValid = false;
    phones.forEach((raw, i) => {
      const p = normalisePhone(raw);
      if (!p.valid) {
        errors[i === 0 ? "phone" : `phone${i}`] = p.reason ?? "Invalid phone";
        return;
      }
      anyValid = true;
      const display = p.display ?? p.national ?? p.e164 ?? raw;
      displays.push(display);
      if (!firstE164) firstE164 = p.e164 ?? p.national;
      add(signals, "phone", p.e164 ?? p.national);
      if (p.region && !normalised.region) normalised.region = p.region;
    });
    if (displays.length) {
      normalised.phone = displays[0];
      normalised.phones = displays.join(", ");
      if (firstE164) normalised.phoneE164 = firstE164;
    }
    if (required && !anyValid && !Object.keys(errors).some((k) => k.startsWith("phone"))) {
      errors.phone = "Enter a valid phone number";
    }
  };

  /** Normalise every supplied email; record signals; report invalids. */
  const processEmails = (required: boolean) => {
    const list: string[] = [];
    emails.forEach((raw, i) => {
      const e = normaliseEmail(raw);
      if (!e.valid) {
        errors[i === 0 ? "email" : `email${i}`] = e.reason ?? "Invalid email";
        return;
      }
      list.push(e.normalised!);
      if (!normalised.emailDomain) normalised.emailDomain = e.domain!;
      add(signals, "email", e.normalised);
    });
    if (list.length) {
      normalised.email = list[0];
      normalised.emails = list.join(", ");
    }
    if (required && !list.length && !Object.keys(errors).some((k) => k.startsWith("email"))) {
      errors.email = "Enter a valid email";
    }
  };

  const applyCommon = () => {
    processPhones(false);
    processEmails(false);
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
        if (w.domain) normalised.domain = w.domain;
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
        add(signals, "username", t.value!.replace(/^@/, "").toLowerCase());
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
    if (input.ageBand && input.ageBand !== "Not sure") normalised.ageBand = input.ageBand.trim();
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
      applyCommon();
      break;
    }
    case "business": {
      applyCommon();
      const hasAnything =
        normalised.businessName || normalised.abn || normalised.acn || normalised.phone || normalised.email || normalised.website;
      if (!hasAnything && !errors.businessName) {
        errors.businessName = "Enter a business name, ABN, ACN, phone, email or website";
      }
      break;
    }
    case "phone": {
      processPhones(true);
      if (normalised.phone) {
        const p = normalisePhone(input.phones?.[0] ?? input.phone ?? "");
        if (p.kind) normalised.phoneKind = p.kind;
      }
      break;
    }
    case "email": {
      processEmails(true);
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
