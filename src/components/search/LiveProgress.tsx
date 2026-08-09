"use client";

import type { LiveState } from "./useSearch";
import type { ProviderStatus } from "@/types/core";
import { Icon } from "@/components/Icon";

const DONE_STATES: ProviderStatus[] = ["complete", "no_results", "unavailable", "not_configured", "error", "rate_limited"];

function statusDot(status: ProviderStatus) {
  if (status === "searching" || status === "queued")
    return <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-500" aria-hidden />;
  if (status === "complete") return <Icon name="check" size={16} className="shrink-0 text-trust-600" />;
  if (status === "no_results") return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" aria-hidden />;
  if (status === "error") return <Icon name="x" size={16} className="shrink-0 text-rose-500" />;
  return <Icon name="alert" size={15} className="shrink-0 text-amber-500" />;
}

function statusText(status: ProviderStatus, count: number): string {
  switch (status) {
    case "searching":
    case "queued":
      return "Searching…";
    case "complete":
      return `${count} result${count === 1 ? "" : "s"}`;
    case "no_results":
      return "No results";
    case "not_configured":
      return "Not configured";
    case "unavailable":
      return "Unavailable";
    case "rate_limited":
      return "Rate limited";
    case "error":
      return "Error";
  }
}

export function LiveProgress({ state }: { state: LiveState }) {
  const list = state.order.map((id) => state.providers.get(id)!).filter(Boolean);
  const total = list.length;
  const done = list.filter((p) => DONE_STATES.includes(p.status)).length;
  const references = list.reduce((a, p) => a + p.results.length, 0);
  const withResults = list.filter((p) => p.status === "complete").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-center gap-3">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <Icon name="search" size={16} />
          </span>
        </span>
        <div>
          <p className="font-semibold text-ink">Searching public sources…</p>
          <p className="text-sm text-ink-muted">
            {done} of {total} sources checked · {references} references · {withResults} with results
          </p>
        </div>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ul className="grid gap-2" aria-live="polite">
        {list.map((p) => {
          const active = p.status === "searching" || p.status === "queued";
          return (
            <li
              key={p.provider}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                active ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-white"
              }`}
            >
              {statusDot(p.status)}
              <span className="flex-1 font-medium text-ink-soft">{p.providerLabel}</span>
              <span className={`text-xs ${p.status === "complete" ? "font-semibold text-trust-600" : "text-slate-400"}`}>
                {statusText(p.status, p.results.length)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
