"use client";

import { FieldShell, inputClass } from "./controls";

// State select — explicit fixed width, NOT the full-width input style (which
// would otherwise beat w-[..] in the cascade and squash the suburb field).
const STATE_SELECT_CLS =
  "w-[96px] shrink-0 rounded-lg border border-slate-300 bg-white pl-3 pr-7 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 appearance-none bg-[length:14px] bg-[right_0.5rem_center] bg-no-repeat";

export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

export const AGE_BANDS = ["Not sure", "Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65–74", "75+"];

/**
 * "Known location" — a compact combined suburb + state control. Enough to
 * distinguish people with common names, without demanding a full address.
 */
export function LocationControl({
  suburb,
  state,
  onSuburb,
  onState,
  error,
  label = "Known location",
}: {
  suburb: string;
  state: string;
  onSuburb: (v: string) => void;
  onState: (v: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <FieldShell id="f-suburb" label={label} error={error} hint="Helps tell apart people with common names">
      <div className="flex gap-2">
        <input
          id="f-suburb"
          name="suburb"
          value={suburb}
          placeholder="Suburb / city"
          onChange={(e) => onSuburb(e.target.value)}
          className={`${inputClass(Boolean(error))} flex-1`}
        />
        <select
          name="state"
          aria-label="State"
          value={state}
          onChange={(e) => onState(e.target.value)}
          className={STATE_SELECT_CLS}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
        >
          <option value="">State</option>
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  );
}
