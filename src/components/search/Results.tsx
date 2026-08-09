"use client";

import type { Candidate, ProviderResult, ProviderStatus, SearchReport } from "@/types/core";
import { Icon } from "@/components/Icon";

const STATUS_META: Record<ProviderStatus, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-slate-100 text-slate-600" },
  searching: { label: "Searching", cls: "bg-brand-50 text-brand-700" },
  complete: { label: "Results found", cls: "bg-emerald-50 text-emerald-700" },
  no_results: { label: "No results", cls: "bg-slate-100 text-slate-500" },
  unavailable: { label: "Unavailable", cls: "bg-amber-50 text-amber-700" },
  not_configured: { label: "Not configured", cls: "bg-amber-50 text-amber-700" },
  error: { label: "Error", cls: "bg-rose-50 text-rose-700" },
  rate_limited: { label: "Rate limited", cls: "bg-amber-50 text-amber-700" },
};

const CATEGORY_TITLES: Record<string, string> = {
  identity: "Identity",
  business: "Business & ABN",
  licences: "Licences",
  professional: "Professional & regulatory",
  contact: "Contact associations",
  online: "Online presence",
  public_records: "Public records",
  website: "Website & domain",
  email: "Email",
  web: "Web references",
};

const CATEGORY_ORDER = ["identity", "business", "licences", "professional", "website", "email", "web", "online", "public_records", "contact"];

function DemoBadge() {
  return (
    <span className="ml-2 rounded bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-700">
      Demo data
    </span>
  );
}

function SourceBadge({ cls }: { cls: "authoritative" | "discovery" }) {
  return cls === "authoritative" ? (
    <span className="inline-flex items-center gap-1 rounded bg-trust-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-trust-600">
      <Icon name="check" size={11} /> Authoritative
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Discovery
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const tone = value >= 70 ? "bg-trust-500" : value >= 40 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${tone} transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}

function CandidateCard({ c, rank }: { c: Candidate; rank: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Possible match {rank}</p>
          <h4 className="mt-0.5 text-lg font-semibold text-ink">
            {c.displayName}
            {c.demo && <DemoBadge />}
          </h4>
          {c.subtitle && <p className="text-sm text-ink-muted">{c.subtitle}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-ink">{c.confidence}%</div>
          <div className="text-[11px] font-medium text-slate-400">identity confidence</div>
        </div>
      </div>
      <div className="mt-3">
        <ConfidenceBar value={c.confidence} />
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {c.evidence.map((e, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            {e.polarity === "match" && <Icon name="check" size={14} className="text-trust-600 shrink-0" />}
            {e.polarity === "conflict" && <Icon name="x" size={14} className="text-rose-500 shrink-0" />}
            {e.polarity === "unknown" && <span className="text-slate-300 shrink-0">?</span>}
            <span className={e.polarity === "conflict" ? "text-rose-700" : e.polarity === "unknown" ? "text-slate-400" : "text-ink-soft"}>
              {e.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultItemRow({ item, providerClass }: { item: ProviderResult["results"][number]; providerClass: "authoritative" | "discovery" }) {
  return (
    <div className="border-t border-slate-100 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink">{item.title}</span>
        <SourceBadge cls={item.sourceClass ?? providerClass} />
        {item.demo && <DemoBadge />}
      </div>
      {item.detail && <p className="mt-1 text-sm text-ink-muted">{item.detail}</p>}
      {item.fields && (
        <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {Object.entries(item.fields).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <dt className="min-w-[92px] shrink-0 font-medium text-slate-500">{k}</dt>
              <dd className="break-words text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Open source <Icon name="external" size={13} />
        </a>
      )}
    </div>
  );
}

export function Results({ report, candidates }: { report: SearchReport; candidates: Candidate[] }) {
  const withResults = report.providers.filter((p) => p.status === "complete");
  const grouped = new Map<string, ProviderResult[]>();
  for (const p of withResults) {
    if (!grouped.has(p.category)) grouped.set(p.category, []);
    grouped.get(p.category)!.push(p);
  }
  const orderedCats = CATEGORY_ORDER.filter((c) => grouped.has(c));
  const top = candidates[0];

  // "Things to double-check": conflicts + unavailable/not-configured providers.
  const doubleChecks: string[] = [];
  if (top) for (const e of top.evidence) if (e.polarity === "conflict") doubleChecks.push(`Conflicting ${e.label.toLowerCase()} between records.`);
  for (const p of report.providers) {
    if (p.status === "not_configured") doubleChecks.push(`${p.providerLabel} was not checked (${p.warnings[0] ?? "not configured"}).`);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-ink">
              {top ? "Possible match identified" : "Here's what we found"}
            </h3>
            <p className="text-sm text-ink-muted">
              {report.summary.sourcesChecked} sources checked · {report.summary.references} public references · {report.summary.sourcesWithResults} with results
            </p>
          </div>
          {top && (
            <div className="text-right">
              <div className="text-3xl font-bold text-ink">{top.confidence}%</div>
              <div className="text-xs font-medium text-slate-400">identity confidence</div>
            </div>
          )}
        </div>
        {report.summary.demo && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-800">
            <Icon name="info" size={15} /> Some results below are clearly-labelled <strong>demo data</strong> shown because demo mode is on.
          </p>
        )}
      </div>

      {/* Candidates */}
      {candidates.length > 0 && (
        <section aria-label="Possible matches" className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Possible matches</h3>
          {candidates.map((c, i) => (
            <CandidateCard key={c.id} c={c} rank={i + 1} />
          ))}
          <p className="text-xs text-ink-muted">
            Confidence means how likely these records describe the same entity — <strong>not</strong> whether they can be trusted.
          </p>
        </section>
      )}

      {/* Category sections */}
      {orderedCats.map((cat) => (
        <section key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-ink">{CATEGORY_TITLES[cat] ?? cat}</h3>
          {grouped.get(cat)!.map((p) => (
            <div key={p.provider} className="mt-2">
              {p.results.map((item, i) => (
                <ResultItemRow key={i} item={item} providerClass={p.sourceClass} />
              ))}
            </div>
          ))}
        </section>
      ))}

      {/* Things to double-check */}
      {doubleChecks.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-amber-800">
            <Icon name="alert" size={16} /> Things to double-check
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
            {[...new Set(doubleChecks)].map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Sources & transparency */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-ink">Sources checked</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-semibold">Source</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Checked</th>
              </tr>
            </thead>
            <tbody>
              {report.providers.map((p) => (
                <tr key={p.provider} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-medium text-ink-soft">
                    {p.sourceUrl ? (
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
                        {p.providerLabel}
                      </a>
                    ) : (
                      p.providerLabel
                    )}
                    {p.demo && <DemoBadge />}
                  </td>
                  <td className="py-2 pr-3">
                    <SourceBadge cls={p.sourceClass} />
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_META[p.status].cls}`}>{STATUS_META[p.status].label}</span>
                  </td>
                  <td className="py-2 text-xs text-slate-400">{new Date(p.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="px-1 text-xs leading-relaxed text-ink-muted">
        Public information can be inaccurate, incomplete or out of date. Check First presents evidence from public sources so you can decide — it does not
        determine whether anyone is safe, honest, or trustworthy, and it is not a criminal-history check.
      </p>
    </div>
  );
}
