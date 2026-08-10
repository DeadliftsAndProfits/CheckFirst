"use client";

import type { LiveState } from "./useSearch";
import type { ProviderStatus, DataOrigin } from "@/types/core";
import { Icon } from "@/components/Icon";

const DONE: ProviderStatus[] = ["complete", "no_results", "unavailable", "not_configured", "error", "rate_limited"];
const REAL: DataOrigin[] = ["live", "local_dataset", "cached"];

function statusDot(status: ProviderStatus) {
  if (status === "searching" || status === "queued") return <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-500" aria-hidden />;
  if (status === "complete") return <Icon name="check" size={16} className="shrink-0 text-trust-600" />;
  if (status === "no_results") return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" aria-hidden />;
  if (status === "error") return <Icon name="x" size={16} className="shrink-0 text-rose-500" />;
  return <Icon name="alert" size={15} className="shrink-0 text-amber-500" />;
}

function statusText(status: ProviderStatus, origin: DataOrigin, count: number): string {
  if (status === "searching" || status === "queued") return "Searching…";
  if (status === "complete") return origin === "link" ? `${count} link${count === 1 ? "" : "s"}` : `${count} result${count === 1 ? "" : "s"}`;
  if (status === "no_results") return "No results";
  if (status === "not_configured") return "Not configured";
  if (status === "unavailable") return "Unavailable";
  if (status === "rate_limited") return "Rate limited";
  return "Error";
}

function originBadge(origin: DataOrigin, status: ProviderStatus) {
  const map: Partial<Record<DataOrigin, { t: string; c: string }>> = {
    live: { t: "LIVE", c: "bg-emerald-100 text-emerald-700" },
    link: { t: "LINK", c: "bg-slate-100 text-slate-500" },
    local_dataset: { t: "LOCAL", c: "bg-indigo-100 text-indigo-700" },
    cached: { t: "CACHED", c: "bg-sky-100 text-sky-700" },
    demo: { t: "DEMO", c: "bg-fuchsia-100 text-fuchsia-700" },
  };
  const b = status === "not_configured" ? { t: "CONFIG", c: "bg-amber-100 text-amber-800" } : map[origin];
  if (!b) return null;
  return <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${b.c}`}>{b.t}</span>;
}

export function LiveProgress({ state }: { state: LiveState }) {
  const list = state.order.map((id) => state.providers.get(id)!).filter(Boolean);
  const total = list.length;
  const done = list.filter((p) => DONE.includes(p.status)).length;
  const real = list.filter((p) => REAL.includes(p.dataOrigin));
  const references = real.filter((p) => p.status === "complete").reduce((a, p) => a + p.results.length, 0);
  const links = list.filter((p) => p.dataOrigin === "link" && p.status === "complete").reduce((a, p) => a + p.results.length, 0);
  const searched = real.filter((p) => DONE.includes(p.status) && p.status !== "not_configured").length;
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
            {searched} source{searched === 1 ? "" : "s"} searched · {references} reference{references === 1 ? "" : "s"} · {links} official link{links === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2" aria-live="polite">
        {list.map((p) => {
          const active = p.status === "searching" || p.status === "queued";
          return (
            <li key={p.provider} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${active ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-white"}`}>
              {statusDot(p.status)}
              <span className="flex-1 truncate font-medium text-ink-soft">{p.providerLabel}</span>
              {originBadge(p.dataOrigin, p.status)}
              <span className={`shrink-0 text-xs ${p.status === "complete" && p.dataOrigin !== "link" ? "font-semibold text-trust-600" : "text-slate-400"}`}>{statusText(p.status, p.dataOrigin, p.results.length)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
