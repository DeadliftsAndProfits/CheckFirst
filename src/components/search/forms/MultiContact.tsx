"use client";

import { inputClass } from "./controls";
import { Icon } from "@/components/Icon";

const MAX = 5;

/**
 * Dynamic list of contact inputs (phone or email). Each input ALWAYS occupies
 * one half-width column on desktop (a 2-col grid), regardless of how many exist
 * — so a single input is half-width with an adjacent [+], and additional inputs
 * fill the next columns and wrap. Each added field is removable; the first is
 * not. Empty added fields are ignored by the caller on submit. Mobile: stacked.
 */
export function MultiContact({
  label,
  values,
  onChange,
  type,
  placeholder,
  errors,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  type: "tel" | "email";
  placeholder: string;
  errors?: Record<string, string>;
}) {
  const list = values.length ? values : [""];
  const base = type === "tel" ? "phone" : "email";

  const setAt = (i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const add = () => list.length < MAX && onChange([...list, ""]);
  const removeAt = (i: number) => {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [""]);
  };

  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-ink-soft">{label}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((val, i) => {
          const err = errors?.[String(i)] ?? (i === 0 ? errors?.[base] : errors?.[`${base}${i}`]);
          return (
            <div key={i}>
              <div className="relative">
                <input
                  name={`${base}${i === 0 ? "" : i}`}
                  type={type}
                  inputMode={type === "tel" ? "tel" : "email"}
                  value={val}
                  placeholder={placeholder}
                  aria-label={`${label} ${i + 1}`}
                  aria-invalid={err ? true : undefined}
                  onChange={(e) => setAt(i, e.target.value)}
                  className={`${inputClass(Boolean(err))} ${i > 0 ? "pr-9" : ""}`}
                />
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Remove ${label} ${i + 1}`}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  >
                    <Icon name="x" size={15} />
                  </button>
                )}
              </div>
              {err && <p className="mt-1 text-xs font-medium text-rose-600">{err}</p>}
            </div>
          );
        })}
        {list.length < MAX && (
          <button
            type="button"
            onClick={add}
            className="flex h-[46px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-sm font-medium text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <Icon name="plus" size={16} /> Add another
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">Add up to {MAX}. More numbers/addresses can strengthen a match when public sources agree.</p>
    </fieldset>
  );
}
