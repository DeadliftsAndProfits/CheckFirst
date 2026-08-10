"use client";

import { useState } from "react";
import type { SearchInput, SearchType } from "@/types/core";
import { Icon } from "@/components/Icon";
import { TextField, SelectField } from "./forms/controls";
import { AU_STATES, AGE_BANDS } from "./forms/LocationControl";
import { MultiContact } from "./forms/MultiContact";

const TAB_META: { id: SearchType; label: string; icon: string }[] = [
  { id: "person", label: "Person", icon: "user" },
  { id: "business", label: "Business", icon: "briefcase" },
  { id: "phone", label: "Phone", icon: "phone" },
  { id: "email", label: "Email", icon: "mail" },
  { id: "website", label: "Website", icon: "globe" },
];

interface OptField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
}
const PERSON_OPTIONAL: OptField[] = [
  { name: "middleName", label: "Middle name", placeholder: "Michael" },
  { name: "phone", label: "Phone", placeholder: "0412 345 678", type: "tel" },
  { name: "email", label: "Email", placeholder: "john@example.com", type: "email" },
  { name: "postcode", label: "Postcode", placeholder: "4000" },
  { name: "address", label: "Street address", placeholder: "12 Example St" },
  { name: "employer", label: "Employer", placeholder: "ABC Plumbing" },
  { name: "occupation", label: "Occupation", placeholder: "Plumber" },
  { name: "businessName", label: "Business name", placeholder: "ABC Plumbing" },
  { name: "abn", label: "ABN", placeholder: "51 824 753 556" },
  { name: "username", label: "Username / handle", placeholder: "@johnsmith" },
];
const BUSINESS_OPTIONAL: OptField[] = [
  { name: "suburb", label: "Suburb / city", placeholder: "Brisbane" },
  { name: "website", label: "Website", placeholder: "abcplumbing.com.au" },
  { name: "phone", label: "Phone", placeholder: "07 1234 5678", type: "tel" },
  { name: "email", label: "Email", placeholder: "info@abcplumbing.com.au", type: "email" },
  { name: "postcode", label: "Postcode", placeholder: "4000" },
  { name: "address", label: "Street address", placeholder: "12 Example St" },
];
// Optional context that can sharpen a phone/email search (§22).
const CONTACT_CONTEXT: OptField[] = [
  { name: "firstName", label: "First name", placeholder: "John" },
  { name: "lastName", label: "Last name", placeholder: "Smith" },
  { name: "businessName", label: "Business", placeholder: "ABC Plumbing" },
  { name: "suburb", label: "Suburb / city", placeholder: "Brisbane" },
];

type Scalars = Record<string, string>;
const emptyScalars = (): Record<SearchType, Scalars> => ({ person: {}, business: {}, phone: {}, email: {}, website: {} });

function routeAbnAcn(raw: string): { abn?: string; acn?: string } {
  return raw.replace(/\D/g, "").length === 9 ? { acn: raw } : { abn: raw };
}

const stateOptions = [{ value: "", label: "State" }, ...AU_STATES.map((s) => ({ value: s, label: s }))];
const ageOptions = AGE_BANDS.map((a) => ({ value: a, label: a }));

function buildInput(tab: SearchType, s: Scalars, phones: string[], emails: string[]): SearchInput {
  const clean = (v?: string) => (v ?? "").trim();
  const put = (o: Record<string, string>, keys: string[]) => {
    for (const k of keys) {
      const v = clean(s[k]);
      if (v) o[k] = v;
    }
  };
  if (tab === "website") return { type: "website", website: clean(s.website) };

  const o: Record<string, string> = {};
  if (tab === "phone") {
    put(o, ["firstName", "lastName", "businessName", "suburb", "state"]);
    return { type: "phone", phones: phones.map((p) => p.trim()).filter(Boolean), ...o };
  }
  if (tab === "email") {
    put(o, ["firstName", "lastName", "businessName", "suburb", "state"]);
    return { type: "email", emails: emails.map((e) => e.trim()).filter(Boolean), ...o };
  }
  if (tab === "person") {
    put(o, ["firstName", "lastName", "suburb", "state", "ageBand", ...PERSON_OPTIONAL.map((f) => f.name)]);
    return { type: "person", ...o };
  }
  // business
  put(o, ["businessName", "state", ...BUSINESS_OPTIONAL.map((f) => f.name)]);
  const ab = clean(s.abnAcn);
  return { type: "business", ...(ab ? routeAbnAcn(ab) : {}), ...o };
}

function clientValidate(tab: SearchType, s: Scalars, phones: string[], emails: string[]): Record<string, string> {
  const e: Record<string, string> = {};
  const has = (k: string) => Boolean((s[k] ?? "").trim());
  if (tab === "person") {
    if (!has("firstName")) e.firstName = "First name is required";
    if (!has("lastName")) e.lastName = "Last name is required";
  } else if (tab === "business") {
    if (!has("businessName") && !has("abnAcn") && !has("website") && !has("phone") && !has("email")) e.businessName = "Enter at least one detail";
  } else if (tab === "phone") {
    if (!phones.some((p) => p.trim())) e.phone = "Enter a phone number";
  } else if (tab === "email") {
    if (!emails.some((x) => x.trim())) e.email = "Enter an email address";
  } else if (tab === "website") {
    if (!has("website")) e.website = "Enter a website or domain";
  }
  return e;
}

export function SearchForm({
  initial,
  submitLabel = "Check first",
  onSubmit,
  serverErrors,
  busy,
  autoFocus,
  advanced = false,
}: {
  initial?: SearchInput;
  submitLabel?: string;
  onSubmit: (input: SearchInput) => void;
  serverErrors?: Record<string, string>;
  busy?: boolean;
  autoFocus?: boolean;
  advanced?: boolean;
}) {
  const [tab, setTab] = useState<SearchType>(initial?.type ?? "person");
  const [scalars, setScalars] = useState<Record<SearchType, Scalars>>(() => {
    const base = emptyScalars();
    if (initial) {
      const s: Scalars = {};
      for (const [k, v] of Object.entries(initial)) if (typeof v === "string" && k !== "type") s[k] = v;
      if (initial.type === "business" && (initial.abn || initial.acn)) s.abnAcn = (initial.abn ?? initial.acn)!;
      base[initial.type] = s;
    }
    return base;
  });
  const [phones, setPhones] = useState<string[]>(initial?.phones?.length ? initial.phones : [""]);
  const [emails, setEmails] = useState<string[]>(initial?.emails?.length ? initial.emails : [""]);
  const [showOptional, setShowOptional] = useState(advanced);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const s = scalars[tab];
  const set = (k: string, v: string) => {
    setScalars((prev) => ({ ...prev, [tab]: { ...prev[tab], [k]: v } }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const err = (k: string) => errors[k] ?? serverErrors?.[k];

  const switchTab = (id: SearchType) => {
    if (busy) return;
    setTab(id);
    setShowOptional(advanced);
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ce = clientValidate(tab, s, phones, emails);
    if (Object.keys(ce).length) {
      setErrors(ce);
      return;
    }
    setErrors({});
    onSubmit(buildInput(tab, s, phones, emails));
  };

  const optionalFields = tab === "person" ? PERSON_OPTIONAL : tab === "business" ? BUSINESS_OPTIONAL : tab === "phone" || tab === "email" ? CONTACT_CONTEXT : [];
  const optionalLabel = tab === "phone" || tab === "email" ? "Add matching details (optional)" : "Add optional matching details";

  return (
    <div>
      <div role="tablist" aria-label="What do you want to check?" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TAB_META.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            disabled={busy}
            onClick={() => switchTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              tab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon name={t.icon} size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="mt-4">
        <div className={advanced ? "" : "min-h-[188px]"}>
          {tab === "person" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField name="firstName" label="First name" value={s.firstName ?? ""} onChange={(v) => set("firstName", v)} placeholder="John" required error={err("firstName")} autoFocus={autoFocus} />
              <TextField name="lastName" label="Last name" value={s.lastName ?? ""} onChange={(v) => set("lastName", v)} placeholder="Smith" required error={err("lastName")} />
              <TextField name="suburb" label="Known location" value={s.suburb ?? ""} onChange={(v) => set("suburb", v)} placeholder="Suburb / city" error={err("suburb")} hint="Helps tell apart common names" />
              <SelectField name="state" label="State" value={s.state ?? ""} onChange={(v) => set("state", v)} options={stateOptions} error={err("state")} />
              <SelectField name="ageBand" label="Approximate age" value={s.ageBand ?? "Not sure"} onChange={(v) => set("ageBand", v)} options={ageOptions} />
            </div>
          )}

          {tab === "business" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField name="businessName" label="Business / company name" value={s.businessName ?? ""} onChange={(v) => set("businessName", v)} placeholder="ABC Plumbing Pty Ltd" error={err("businessName")} autoFocus={autoFocus} />
              </div>
              <TextField name="abnAcn" label="ABN / ACN" value={s.abnAcn ?? ""} onChange={(v) => set("abnAcn", v)} placeholder="51 824 753 556" error={err("abn") ?? err("acn")} />
              <SelectField name="state" label="State" value={s.state ?? ""} onChange={(v) => set("state", v)} options={stateOptions} error={err("state")} />
            </div>
          )}

          {tab === "phone" && <MultiContact label="Phone number(s)" values={phones} onChange={setPhones} type="tel" placeholder="0412 345 678" errors={{ ...errors, ...serverErrors }} />}
          {tab === "email" && <MultiContact label="Email address(es)" values={emails} onChange={setEmails} type="email" placeholder="john@example.com" errors={{ ...errors, ...serverErrors }} />}

          {tab === "website" && (
            <div>
              <TextField name="website" label="Website or domain" value={s.website ?? ""} onChange={(v) => set("website", v)} placeholder="abcplumbing.com.au" required error={err("website")} autoFocus={autoFocus} />
              <p className="mt-2 text-sm text-ink-muted">We check DNS, mail setup, SSL certificate, registration age and displayed business identity.</p>
            </div>
          )}
        </div>

        {optionalFields.length > 0 && (
          <div className="mt-3">
            {!advanced && (
              <button type="button" onClick={() => setShowOptional((v) => !v)} aria-expanded={showOptional} className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                <Icon name="chevron" size={16} className={`transition-transform ${showOptional ? "rotate-180" : ""}`} />
                {optionalLabel}
              </button>
            )}
            {(showOptional || advanced) && (
              <div className={advanced ? "mt-2" : "mt-3 animate-fade-up"}>
                {advanced && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Additional matching information</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {optionalFields.map((f) =>
                    f.name === "state" ? (
                      <SelectField key="state" name="state" label="State" value={s.state ?? ""} onChange={(v) => set("state", v)} options={stateOptions} />
                    ) : (
                      <TextField key={f.name} name={f.name} label={f.label} value={s[f.name] ?? ""} onChange={(v) => set(f.name, v)} placeholder={f.placeholder} type={f.type} error={err(f.name)} />
                    ),
                  )}
                  {(tab === "phone" || tab === "email") && <SelectField name="state" label="State" value={s.state ?? ""} onChange={(v) => set("state", v)} options={stateOptions} />}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-60"
        >
          <Icon name="search" size={18} /> {submitLabel}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <Icon name="shield" size={13} /> Public information only · the person is not notified
        </p>
      </form>
    </div>
  );
}
