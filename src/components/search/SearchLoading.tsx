"use client";

import type { LiveState } from "./useSearch";
import type { ProviderStatus, DataOrigin } from "@/types/core";
import { Icon } from "@/components/Icon";

const DONE: ProviderStatus[] = ["complete", "no_results", "unavailable", "not_configured", "error", "rate_limited"];
const REAL: DataOrigin[] = ["live", "local_dataset", "cached"];

function initialsOf(name: string): string {
  const clean = name.replace(/https?:\/\//g, "").replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "CF";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

function originBadge(origin: DataOrigin, status: ProviderStatus) {
  const map: Partial<Record<DataOrigin, { t: string; c: string }>> = {
    live: { t: "LIVE", c: "bg-accent-100 text-accent-600" },
    link: { t: "LINK", c: "bg-slate-100 text-slate-500" },
    local_dataset: { t: "LOCAL", c: "bg-indigo-100 text-indigo-700" },
    cached: { t: "CACHED", c: "bg-sky-100 text-sky-700" },
    demo: { t: "DEMO", c: "bg-fuchsia-100 text-fuchsia-700" },
  };
  const b = status === "not_configured" ? { t: "CONFIG", c: "bg-amber-100 text-amber-800" } : map[origin];
  return b ? <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${b.c}`}>{b.t}</span> : null;
}

function statusText(status: ProviderStatus, origin: DataOrigin, n: number): string {
  if (status === "searching" || status === "queued") return "Searching";
  if (status === "complete") return origin === "link" ? `${n} link${n === 1 ? "" : "s"}` : "Complete";
  if (status === "no_results") return "No results";
  if (status === "not_configured") return "Not configured";
  if (status === "unavailable") return "Unavailable";
  if (status === "rate_limited") return "Rate limited";
  return "Error";
}

export function SearchLoading({ state, subject }: { state: LiveState; subject: string }) {
  const list = state.order.map((id) => state.providers.get(id)!).filter(Boolean);
  const total = list.length || 1;
  const done = list.filter((p) => DONE.includes(p.status)).length;
  const pct = Math.round((done / total) * 100);
  const real = list.filter((p) => REAL.includes(p.dataOrigin));
  const references = real.filter((p) => p.status === "complete").reduce((a, p) => a + p.results.length, 0);
  const searched = real.filter((p) => DONE.includes(p.status) && p.status !== "not_configured").length;

  const active = list.find((p) => p.status === "searching" || p.status === "queued");
  const label = done >= total ? "Assembling your trust report" : active ? active.providerLabel : "Starting search";

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
      {/* Radar */}
      <div className="flex justify-center">
        <div
          className="relative aspect-square w-[min(340px,72vw)] overflow-hidden rounded-full border border-accent-500/20 shadow-card"
          style={{
            background:
              "radial-gradient(circle, transparent 0 24%, rgba(20,184,166,.17) 24.5% 25%, transparent 25.5% 49%, rgba(20,184,166,.14) 49.5% 50%, transparent 50.5% 74%, rgba(20,184,166,.12) 74.5% 75%, transparent 75.5%), linear-gradient(rgba(20,184,166,.10), rgba(20,184,166,.10)) center/1px 100% no-repeat, linear-gradient(90deg, rgba(20,184,166,.10), rgba(20,184,166,.10)) center/100% 1px no-repeat, #f7fdfc",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-full animate-sweep"
            style={{ background: "conic-gradient(from 0deg, rgba(20,184,166,0), rgba(20,184,166,.34) 28deg, rgba(20,184,166,0) 65deg)" }}
          />
          <span aria-hidden className="absolute left-[68%] top-[35%] h-3 w-3 animate-blip rounded-full bg-accent-500 shadow-[0_0_0_8px_rgba(20,184,166,.14),0_0_22px_rgba(20,184,166,.6)]" />
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.6rem] bg-navy-900 text-2xl font-extrabold tracking-tightest text-white shadow-lift">
            {initialsOf(subject)}
          </div>
        </div>
      </div>

      {/* Copy + progress */}
      <div className="reveal">
        <span className="eyebrow text-accent-600">Search in progress</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Checking {subject}</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          We&rsquo;re correlating the details you supplied across public sources. The source trail is deliberately visible — every result stays traceable to where
          it came from.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
          <div className="mb-2.5 flex items-center justify-between gap-4">
            <strong className="text-sm font-bold text-ink">{label}</strong>
            <span className="text-sm font-extrabold text-accent-600">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {searched} source{searched === 1 ? "" : "s"} searched · {references} reference{references === 1 ? "" : "s"} found
          </p>

          <ul className="mt-4 grid gap-2" aria-live="polite">
            {list.map((p) => {
              const activeRow = p.status === "searching" || p.status === "queued";
              const doneRow = DONE.includes(p.status) && p.status === "complete" && p.dataOrigin !== "link";
              return (
                <li
                  key={p.provider}
                  className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    activeRow ? "bg-accent-50 text-ink" : "bg-slate-50 text-ink-muted"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[11px] font-black ${doneRow ? "border-accent-500 bg-accent-500 text-white" : "border-slate-200 bg-white text-navy-800"}`}>
                    <Icon name={activeRow ? "search" : doneRow ? "check" : "clock"} size={15} />
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-ink-soft">{p.providerLabel}</span>
                    {originBadge(p.dataOrigin, p.status)}
                  </span>
                  <span className={`text-[11px] font-bold ${activeRow ? "text-accent-600" : p.status === "complete" && p.dataOrigin !== "link" ? "text-accent-600" : "text-slate-400"}`}>
                    {statusText(p.status, p.dataOrigin, p.results.length)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
