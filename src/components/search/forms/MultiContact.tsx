"use client";

import { inputClass } from "./controls";
import { Icon } from "@/components/Icon";

const MAX = 5;

/**
 * Dynamic list of contact inputs (phone or email). Half-width on desktop with an
 * adjacent [+] control; wraps to new rows; each added field is removable; the
 * first is not. Empty added fields are ignored by the caller on submit.
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
  /** Per-index errors keyed by "0","1",… (index 0 also accepts base key). */
  errors?: Record<string, string>;
}) {
  const list = values.length ? values : [""];

  const setAt = (i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const add = () => {
    if (list.length >= MAX) return;
    onChange([...list, ""]);
  };
  const removeAt = (i: number) => {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [""]);
  };

  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-ink-soft">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {list.map((val, i) => {
          const err = errors?.[String(i)] ?? (i === 0 ? errors?.[type === "tel" ? "phone" : "email"] : undefined);
          return (
            <div key={i} className="flex min-w-[calc(50%-1.5rem)] flex-1 items-start gap-1.5 sm:min-w-[calc(50%-1.75rem)]">
              <div className="flex-1">
                <div className="relative">
                  <input
                    name={`${type === "tel" ? "phone" : "email"}${i === 0 ? "" : i}`}
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
            </div>
          );
        })}
        {list.length < MAX && (
          <button
            type="button"
            onClick={add}
            aria-label={`Add another ${label.toLowerCase()}`}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center self-start rounded-lg border border-dashed border-slate-300 text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <Icon name="plus" size={18} />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">Add up to {MAX}. More numbers/addresses can strengthen a match when public sources agree.</p>
    </fieldset>
  );
}
