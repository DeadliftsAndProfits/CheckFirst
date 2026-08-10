/**
 * Whole-input validation & normalisation for a SearchInput.
 *
 * Returns per-field errors (for the form), a flat normalised map (for the
 * report's "what we searched" panel and source transparency), and the set of
 * entity signals the confidence engine will use.
 *
 * Supports multiple phones (`phones[]`) and emails (`emails[]`) in any mode,
 * an approximate `ageBand`, and optional context fields (name / business /
 * location) on phone & email searches for correlation (§22). Singular
 * `phone`/`email` remain supported and are merged into the arrays.
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

function mergeContacts(singular?: string, array?: string[]): string[] {
  const all = [singular ?? "", ...(array ?? [])].map((s) => (s ?? "").trim()).filter(Boolean);
  return [...new Set(all)].slice(0, MAX_CONTACTS);
}

export function validateAndNormalise(input: SearchInput): ValidationOutput {
  const errors: Record<string, string> = {};
  const normalised: Record<string, string> = {};
  const signals: EntitySignal[] = [];
  const add = (kind: EntitySignal["kind"], value?: string) => {
    if (value) signals.push({ kind, value });
  };

  const phones = mergeContacts(input.phone, input.phones);
  const emails = mergeContacts(input.email, input.emails);

  const processPhones = (required: boolean) => {
    const displays: string[] = [];
    phones.forEach((raw, i) => {
      const p = normalisePhone(raw);
      if (!p.valid) {
        errors[i === 0 ? "phone" : `phone${i}`] = p.reason ?? "Invalid phone";
        return;
      }
      displays.push(p.display ?? p.national ?? p.e164 ?? raw);
      if (i === 0 && p.kind) normalised.phoneKind = p.kind;
      if (p.region && !normalised.region) normalised.region = p.region;
      add("phone", p.e164 ?? p.national);
    });
    if (displays.length) {
      normalised.phone = displays[0];
      normalised.phones = displays.join(", ");
    }
    if (required && !displays.length && !Object.keys(errors).some((k) => k.startsWith("phone"))) {
      errors.phone = "Enter a valid phone number";
    }
  };

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
      add("email", e.normalised);
    });
    if (list.length) {
      normalised.email = list[0];
      normalised.emails = list.join(", ");
    }
    if (required && !list.length && !Object.keys(errors).some((k) => k.startsWith("email"))) {
      errors.email = "Enter a valid email";
    }
  };

  /** All non-contact fields — usable by any search type as context. */
  const applyContext = () => {
    const first = input.firstName ? normaliseName(input.firstName) : undefined;
    const last = input.lastName ? normaliseName(input.lastName) : undefined;
    if (first && !first.valid) errors.firstName = first.reason ?? "Invalid first name";
    if (last && !last.valid) errors.lastName = last.reason ?? "Invalid last name";
    if (first?.valid) normalised.firstName = first.display!;
    if (last?.valid) normalised.lastName = last.display!;
    if (first?.valid && last?.valid) {
      normalised.fullName = `${first.display} ${last.display}`;
      add("name", `${first.key} ${last.key}`);
    }
    if (input.middleName) {
      const n = normaliseName(input.middleName);
      if (!n.valid) errors.middleName = n.reason ?? "Invalid middle name";
      else {
        normalised.middleName = n.display!;
        add("middleName", n.key);
      }
    }
    if (input.abn) {
      const a = normaliseAbn(input.abn);
      if (!a.valid) errors.abn = a.reason ?? "Invalid ABN";
      else {
        normalised.abn = a.display!;
        add("abn", a.abn);
      }
    }
    if (input.acn) {
      const a = normaliseAcn(input.acn);
      if (!a.valid) errors.acn = a.reason ?? "Invalid ACN";
      else {
        normalised.acn = a.display!;
        add("acn", a.acn);
      }
    }
    if (input.website) {
      const w = normaliseUrl(input.website);
      if (!w.valid) errors.website = w.reason ?? "Invalid website";
      else {
        normalised.website = w.hostname!;
        normalised.origin = w.origin!;
        if (w.domain) normalised.domain = w.domain;
        add("website", w.hostname);
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
          if (kind) add(kind, comparisonKey(t.value!));
        }
      }
    }
    if (input.state) {
      const st = normaliseState(input.state);
      if (!st) errors.state = "Unknown state";
      else {
        normalised.state = st;
        add("state", st);
      }
    }
    if (input.postcode) {
      const pc = normalisePostcode(input.postcode);
      if (!pc) errors.postcode = "Postcode must be 4 digits";
      else {
        normalised.postcode = pc;
        add("postcode", pc);
      }
    }
    if (input.username) {
      const t = normaliseText(input.username, 60);
      if (!t.valid) errors.username = "Invalid username";
      else {
        normalised.username = t.value!;
        add("username", t.value!.replace(/^@/, "").toLowerCase());
      }
    }
    if (input.ageBand && input.ageBand !== "Not sure") normalised.ageBand = input.ageBand.trim();
  };

  switch (input.type) {
    case "person": {
      processPhones(false);
      processEmails(false);
      applyContext();
      if (!normalised.firstName) errors.firstName ??= "First name is required";
      if (!normalised.lastName) errors.lastName ??= "Last name is required";
      break;
    }
    case "business": {
      processPhones(false);
      processEmails(false);
      applyContext();
      const hasAnything =
        normalised.businessName || normalised.abn || normalised.acn || normalised.phone || normalised.email || normalised.website;
      if (!hasAnything && !errors.businessName) {
        errors.businessName = "Enter a business name, ABN, ACN, phone, email or website";
      }
      break;
    }
    case "phone": {
      processPhones(true);
      processEmails(false);
      applyContext();
      break;
    }
    case "email": {
      processEmails(true);
      processPhones(false);
      applyContext();
      break;
    }
    case "website": {
      applyContext();
      if (!normalised.website) errors.website ??= "Enter a valid website";
      break;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, normalised, signals };
}
