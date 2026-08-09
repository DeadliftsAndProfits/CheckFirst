"use client";

import { useMemo, useState } from "react";
import type { SearchInput, SearchType } from "@/types/core";
import { TABS, tabById, type FieldDef } from "./tabs";
import { useSearch } from "./useSearch";
import { LiveProgress } from "./LiveProgress";
import { Results } from "./Results";
import { Icon } from "@/components/Icon";

type FormState = Record<string, string>;

/** Light client-side check; the server is the authority (returns 422 with field errors). */
function clientValidate(tabId: SearchType, form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const tab = tabById(tabId);
  for (const f of tab.primary) {
    if (f.required && !form[f.name]?.trim()) errors[f.name] = `${f.label} is required`;
  }
  if (tabId === "business") {
    const any = ["businessName", "abn", "acn", "phone", "email", "website"].some((k) => form[k]?.trim());
    if (!any) errors.businessName = "Enter at least one detail";
  }
  return errors;
}

function Field({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `f-${field.name}`;
  return (
    <div className={field.half ? "sm:col-span-1" : "sm:col-span-2"}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">
        {field.label}
        {field.required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        id={id}
        name={field.name}
        type={field.type ?? "text"}
        value={value}
        placeholder={field.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
          error ? "border-rose-400" : "border-slate-300"
        }`}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function SearchExperience() {
  const [activeTab, setActiveTab] = useState<SearchType>("person");
  const [forms, setForms] = useState<Record<SearchType, FormState>>({
    person: {},
    business: {},
    phone: {},
    email: {},
    website: {},
  });
  const [showOptional, setShowOptional] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, search, reset } = useSearch();

  const tab = useMemo(() => tabById(activeTab), [activeTab]);
  const form = forms[activeTab];
  const busy = state.phase === "searching";

  const setField = (name: string, value: string) => {
    setForms((f) => ({ ...f, [activeTab]: { ...f[activeTab], [name]: value } }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  const switchTab = (id: SearchType) => {
    if (busy) return;
    setActiveTab(id);
    setShowOptional(false);
    setErrors({});
    reset();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = clientValidate(activeTab, form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    const input: SearchInput = { type: activeTab, ...form };
    search(input);
  };

  const fieldError = (name: string) => errors[name] ?? state.fieldErrors?.[name];
  const showForm = state.phase === "idle" || state.phase === "error";

  return (
    <div className="w-full">
      {/* Tabs */}
      <div role="tablist" aria-label="What do you want to check?" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            disabled={busy}
            onClick={() => switchTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              activeTab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon name={t.icon} size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {showForm && (
          <form onSubmit={onSubmit} noValidate className="animate-fade-up">
            <p className="mb-3 text-sm text-ink-muted">{tab.blurb}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tab.primary.map((f) => (
                <Field key={f.name} field={f} value={form[f.name] ?? ""} error={fieldError(f.name)} onChange={(v) => setField(f.name, v)} />
              ))}
            </div>

            {/* Optional details (Person) */}
            {tab.optional && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowOptional((s) => !s)}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                  aria-expanded={showOptional}
                >
                  <Icon name="chevron" size={16} className={`transition-transform ${showOptional ? "rotate-180" : ""}`} />
                  {tab.optionalLabel}
                </button>
                {showOptional && (
                  <div className="mt-3 animate-fade-up">
                    <p className="mb-2 text-xs text-ink-muted">{tab.optionalHint}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {tab.optional.map((f) => (
                        <Field key={f.name} field={f} value={form[f.name] ?? ""} error={fieldError(f.name)} onChange={(v) => setField(f.name, v)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.phase === "error" && state.error && (
              <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <Icon name="alert" size={15} /> {state.error}
              </p>
            )}

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <Icon name="search" size={18} /> Check first
            </button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <Icon name="shield" size={13} /> Public information only · the person is not notified
            </p>
          </form>
        )}

        {busy && <LiveProgress state={state} />}

        {state.phase === "done" && state.report && (
          <div className="animate-fade-up">
            <button
              onClick={() => {
                reset();
                setErrors({});
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <Icon name="chevron" size={15} className="rotate-90" /> New search
            </button>
            <Results report={state.report} candidates={state.candidates} />
          </div>
        )}
      </div>
    </div>
  );
}
