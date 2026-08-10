"use client";

import type { ReactNode } from "react";

const inputCls = (error?: boolean) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] text-ink shadow-[inset_0_1px_2px_rgba(9,17,31,0.03)] outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 ${
    error ? "border-rose-400 focus:ring-rose-400/15" : "border-slate-200 focus:ring-brand-500/12"
  }`;

export function FieldShell({
  id,
  label,
  required,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  error,
  hint,
  autoFocus,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  required?: boolean;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const id = `f-${name}`;
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls(Boolean(error))}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
  required,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  const id = `f-${name}`;
  return (
    <FieldShell id={id} label={label} required={required} error={error}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls(Boolean(error))} appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export const inputClass = inputCls;
