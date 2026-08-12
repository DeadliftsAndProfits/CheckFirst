"use client";

import { useMemo, useState } from "react";
import type { Candidate, ProviderResult, ProviderStatus, DataOrigin, SearchReport, IdentitySummary } from "@/types/core";
import { Icon } from "@/components/Icon";

/* ---------------------------------- bits ---------------------------------- */

function initialsOf(name: string): string {
  const clean = name.replace(/https?:\/\//g, "").replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "CF";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

function StatusPill({ tone, children }: { tone: "good" | "warn" | "neutral" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "good" ? "bg-accent-50 text-accent-600" : tone === "warn" ? "bg-amber-50 text-amber-700" : tone === "info" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-muted";
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${cls}`}>{children}</span>;
}

const ORIGIN_META: Partial<Record<DataOrigin, { t: string; c: string }>> = {
  live: { t: "LIVE", c: "bg-accent-100 text-accent-600" },
  link: { t: "LINK", c: "bg-slate-100 text-slate-500" },
  local_dataset: { t: "LOCAL", c: "bg-indigo-100 text-indigo-700" },
  cached: { t: "CACHED", c: "bg-sky-100 text-sky-700" },
  demo: { t: "DEMO", c: "bg-fuchsia-100 text-fuchsia-700" },
};
function OriginBadge({ p }: { p: ProviderResult }) {
  const b = p.status === "not_configured" ? { t: "NEEDS CONFIG", c: "bg-amber-100 text-amber-800" } : ORIGIN_META[p.dataOrigin];
  return b ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${b.c}`}>{b.t}</span> : null;
}

function Panel({ title, sub, pill, children }: { title: string; sub?: string; pill?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-bold tracking-tight text-ink">{title}</h3>
          {sub && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{sub}</p>}
        </div>
        {pill}
      </div>
      {children}
    </div>
  );
}

/** Render a provider's result items as premium data-list rows (used inside a Panel). */
function ProviderBlock({ p }: { p: ProviderResult }) {
  return (
    <div>
      {p.sourceUrl && (
        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
          Open source <Icon name="external" size={12} />
        </a>
      )}
      {p.results.map((item, i) => (
        <div key={i} className="mb-3 last:mb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-soft">{item.title}</span>
            {item.demo && <span className="rounded bg-fuchsia-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-fuchsia-700">Demo</span>}
          </div>
          {item.detail && <p className="mt-0.5 text-sm text-ink-muted">{item.detail}</p>}
          {item.fields && (
            <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {Object.entries(item.fields).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-50 py-1">
                  <dt className="shrink-0 text-xs text-ink-muted">{k}</dt>
                  <dd className="text-right text-[13px] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-8 text-center">
      <p className="text-sm text-ink-muted">{text}</p>
    </div>
  );
}

/* ----------------------- web references (grouped) ------------------------- */

const PLATFORMS: { host: string; name: string }[] = [
  { host: "linkedin.com", name: "LinkedIn" },
  { host: "facebook.com", name: "Facebook" },
  { host: "instagram.com", name: "Instagram" },
  { host: "x.com", name: "X" },
  { host: "twitter.com", name: "X" },
  { host: "reddit.com", name: "Reddit" },
  { host: "github.com", name: "GitHub" },
  { host: "youtube.com", name: "YouTube" },
  { host: "tiktok.com", name: "TikTok" },
  { host: "pinterest.com", name: "Pinterest" },
];
const DIRECTORY_HOSTS = ["whitepages.com.au", "yellowpages.com.au", "truelocal.com.au", "localsearch.com.au", "productreview.com.au", "hotfrog.com.au", "startlocal.com.au", "wordofmouth.com.au"];

function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function classifyRef(url?: string): { group: "social" | "directory" | "web"; platform?: string } {
  const h = hostOf(url);
  const p = PLATFORMS.find((x) => h === x.host || h.endsWith("." + x.host));
  if (p) return { group: "social", platform: p.name };
  if (DIRECTORY_HOSTS.some((d) => h === d || h.endsWith("." + d))) return { group: "directory" };
  return { group: "web" };
}

/** A single web result rendered like a proper search result. */
function RefRow({ item }: { item: ProviderResult["results"][number] }) {
  const host = hostOf(item.sourceUrl);
  const cl = classifyRef(item.sourceUrl);
  return (
    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="block rounded-xl border border-slate-100 bg-white px-3.5 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30">
      <div className="flex items-center gap-2">
        {cl.platform && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">{cl.platform}</span>}
        <span className="truncate text-sm font-semibold text-brand-700">{item.title}</span>
        <Icon name="external" size={12} className="ml-auto shrink-0 text-slate-300" />
      </div>
      {host && <div className="mt-0.5 truncate text-xs text-accent-600">{host}</div>}
      {item.detail && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{item.detail}</p>}
    </a>
  );
}

function GroupedRefs({ items }: { items: ProviderResult["results"] }) {
  const groups = { social: [] as typeof items, directory: [] as typeof items, web: [] as typeof items };
  for (const it of items) groups[classifyRef(it.sourceUrl).group].push(it);
  const sections: { key: keyof typeof groups; title: string }[] = [
    { key: "social", title: "Public profiles" },
    { key: "directory", title: "Directories & listings" },
    { key: "web", title: "Web references" },
  ];
  return (
    <div className="space-y-4">
      {sections
        .filter((s) => groups[s.key].length)
        .map((s) => (
          <div key={s.key}>
            <p className="eyebrow mb-2 text-ink-faint">
              {s.title} · {groups[s.key].length}
            </p>
            <div className="grid gap-2">
              {groups[s.key].map((it, i) => (
                <RefRow key={i} item={it} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

/**
 * Real web results, split into "likely this subject" (name + employer/location
 * corroborated) and "other people with this name" (demoted/collapsed), so the
 * matched identity leads and same-name strangers don't dominate.
 */
function WebReferences({ p, subject }: { p: ProviderResult; subject?: string }) {
  const classified = p.results.some((r) => r.matchesSubject !== undefined);
  const matched = classified ? p.results.filter((r) => r.matchesSubject) : p.results;
  const others = classified ? p.results.filter((r) => !r.matchesSubject) : [];

  return (
    <div className="space-y-4">
      {matched.length > 0 ? (
        <div>
          {classified && <p className="mb-2 text-sm font-bold text-ink">Likely {subject ?? "this subject"} · {matched.length}</p>}
          <GroupedRefs items={matched} />
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No result clearly matched the details you gave. The closest same-name results are below.</p>
      )}

      {others.length > 0 && (
        <details className="group rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink-soft">
            Other people with this name · {others.length}
            <Icon name="chevron" size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mb-3 mt-2 text-xs text-ink-muted">These share the name but don&rsquo;t match the employer/location you provided — probably not the same person.</p>
          <GroupedRefs items={others} />
        </details>
      )}

      <p className="text-[11px] text-ink-muted">
        Found via {p.sourceAuthority ?? "web search"}. Public search results — a matching name doesn&rsquo;t confirm it&rsquo;s the same person.
      </p>
    </div>
  );
}

/* --------------------------------- score ---------------------------------- */

function ScoreRing({ value }: { value: number | null }) {
  const v = value ?? 0;
  const col = value == null ? "#64748b" : v >= 70 ? "#14b8a6" : v >= 40 ? "#f59e0b" : "#94a3b8";
  return (
    <div
      className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${col} 0 ${v}%, rgba(255,255,255,.14) ${v}% 100%)` }}
    >
      <div className="absolute inset-[8px] rounded-full bg-navy-800" />
      <strong className="relative text-2xl font-extrabold tracking-tightest text-white">{value == null ? "—" : v}</strong>
    </div>
  );
}

/* ---------------------------- identity summary ---------------------------- */

function IdentityPanel({ id, confidence }: { id: IdentitySummary; confidence?: number }) {
  const tone = confidence == null ? "neutral" : confidence >= 70 ? "good" : confidence >= 40 ? "warn" : "neutral";
  const label = confidence == null ? "Assembled" : confidence >= 70 ? "Strong match" : confidence >= 40 ? "Possible match" : "Weak match";
  return (
    <Panel title="Identity summary" sub="Best-fit identity assembled from the details you gave and corroborating public sources." pill={<StatusPill tone={tone}>{label}</StatusPill>}>
      {id.bestProfile && (
        <a href={id.bestProfile.url} target="_blank" rel="noopener noreferrer nofollow" className="mb-4 flex items-start gap-3 rounded-2xl border border-accent-300 bg-accent-50/50 p-3.5 transition-colors hover:border-accent-400">
          <span className="mt-0.5 rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{id.bestProfile.platform}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{id.bestProfile.title}</p>
            {id.bestProfile.snippet && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">{id.bestProfile.snippet}</p>}
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-accent-600">Best profile match <Icon name="external" size={12} /></p>
          </div>
        </a>
      )}
      <dl>
        {id.fields.map((f, i) => (
          <div key={i} className="grid grid-cols-[112px_1fr_auto] items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[130px_1fr_auto]">
            <dt className="text-xs text-ink-muted">{f.label}</dt>
            <dd className="text-[13px] font-semibold text-ink">{f.value}</dd>
            <dd className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-wide ${f.verified ? "text-accent-600" : "text-slate-400"}`}>
              {f.verified && <Icon name="check" size={11} className="mr-0.5 inline" />}
              {f.note}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* -------------------------------- results --------------------------------- */

const CAT_TO_TAB: Record<string, string> = {
  identity: "overview",
  business: "business",
  licences: "licences",
  professional: "licences",
  website: "digital",
  web: "digital",
  online: "digital",
  email: "contact",
  contact: "contact",
};
const OPTIONAL_TABS = [
  { id: "contact", label: "Contact & digital" },
  { id: "business", label: "Business links" },
  { id: "licences", label: "Licences" },
  { id: "digital", label: "Digital footprint" },
];

export function Results({ report, candidates, subject }: { report: SearchReport; candidates: Candidate[]; subject: string }) {
  const s = report.summary;
  const top = candidates[0] ?? null;

  const realComplete = useMemo(() => report.providers.filter((p) => p.status === "complete" && p.dataOrigin !== "link"), [report.providers]);
  const linkProviders = useMemo(() => report.providers.filter((p) => p.dataOrigin === "link" && p.status === "complete"), [report.providers]);

  // providers routed to each optional tab
  const tabProviders = useMemo(() => {
    const m: Record<string, ProviderResult[]> = { contact: [], business: [], licences: [], digital: [] };
    for (const p of realComplete) {
      const tab = CAT_TO_TAB[p.category];
      if (tab && tab !== "overview" && m[tab]) m[tab].push(p);
    }
    return m;
  }, [realComplete]);

  const tabs = useMemo(
    () => ["overview", ...OPTIONAL_TABS.filter((t) => tabProviders[t.id]?.length).map((t) => t.id), "sources"],
    [tabProviders],
  );
  const tabLabel = (id: string) =>
    id === "overview" ? "Overview" : id === "sources" ? "Source trail" : OPTIONAL_TABS.find((t) => t.id === id)?.label ?? id;

  const [active, setActive] = useState("overview");
  const activeTab = tabs.includes(active) ? active : "overview";

  // identity badges (honest — only what's backed by real/demo findings)
  const badges: string[] = [];
  if (top) badges.push(top.confidence >= 70 ? "Identity likely matched" : "Possible match");
  if (report.identity?.bestProfile) badges.push(`${report.identity.bestProfile.platform} profile found`);
  if (realComplete.concat(report.providers.filter((p) => p.dataOrigin === "demo" && p.status === "complete")).some((p) => p.category === "business")) badges.push("Business record found");
  if (report.providers.some((p) => p.category === "licences" && p.status === "complete" && p.dataOrigin !== "link")) badges.push("Licence record");
  if (realComplete.some((p) => p.category === "website")) badges.push("Website checked");
  if (s.demo) badges.push("Demo data");

  const matchSignals = top ? top.evidence.filter((e) => e.polarity === "match").length : 0;

  // key findings (Overview) derived from real provider outcomes
  const findings = useMemo(() => {
    const out: { tone: "good" | "warn" | "info"; title: string; body: string }[] = [];
    for (const p of realComplete.slice(0, 4)) out.push({ tone: "good", title: `${p.providerLabel} returned results`, body: p.results[0]?.title ?? "A public source matched this search." });
    for (const p of report.providers.filter((x) => x.status === "not_configured").slice(0, 2)) out.push({ tone: "info", title: `${p.providerLabel} not checked`, body: p.warnings[0] ?? "This source needs configuration." });
    for (const p of report.providers.filter((x) => x.status === "unavailable" || x.status === "error").slice(0, 1)) out.push({ tone: "warn", title: `${p.providerLabel} unavailable`, body: p.warnings[0] ?? p.error ?? "A source could not be reached." });
    return out;
  }, [realComplete, report.providers]);

  const doubleChecks: string[] = [];
  if (top) for (const e of top.evidence) if (e.polarity === "conflict") doubleChecks.push(`Conflicting ${e.label.toLowerCase()} between records.`);
  for (const p of report.providers) if (p.status === "not_configured") doubleChecks.push(`${p.providerLabel} was not checked (${p.warnings[0] ?? "needs configuration"}).`);

  const webProvider = report.providers.find((p) => p.category === "web" && p.status === "complete" && p.results.length > 0);
  const webTop = webProvider ? (webProvider.results.some((r) => r.matchesSubject) ? webProvider.results.filter((r) => r.matchesSubject) : webProvider.results) : [];

  return (
    <div className="space-y-5">
      {/* IDENTITY HERO */}
      <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-navy-900 via-navy-850 to-navy-700 p-6 text-white shadow-lift sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-44 h-[360px] w-[360px] rounded-full border-[70px] border-white/[0.035]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="flex items-center gap-4">
            <div className="grid h-[70px] w-[70px] shrink-0 place-items-center rounded-[1.4rem] bg-gradient-to-br from-accent-100 to-accent-300 text-xl font-black text-navy-900">
              {initialsOf(top?.displayName ?? subject)}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{top?.displayName ?? subject}</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                {top?.subtitle ? `${top.subtitle} · ` : ""}
                {top ? `${matchSignals} corroborating identity signal${matchSignals === 1 ? "" : "s"}` : "Public sources checked — review the evidence below"}
              </p>
              {badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span key={b} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-white/12 bg-white/[0.08] p-4">
            <ScoreRing value={top ? top.confidence : null} />
            <div>
              <strong className="block text-sm font-bold">{top ? "Match confidence" : "No confident match"}</strong>
              <span className="mt-1 block text-[11px] leading-relaxed text-white/65">
                {top ? "How likely these records describe the same entity — not whether they can be trusted." : "Not enough corroborating public signals for a single confident match."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Sources searched" value={s.sourcesSearched} note={`${s.returnedResults} returned results`} />
        <SummaryCard label="Possible matches" value={candidates.length} note={top ? `${top.confidence}% top match` : "review the evidence"} />
        <SummaryCard label="Official links" value={s.links} note="open the source yourself" />
        <SummaryCard label="To double-check" value={new Set(doubleChecks).size} note="verify before trusting" />
      </div>

      {s.demo && (
        <p className="flex items-center gap-2 rounded-xl bg-fuchsia-50 px-3.5 py-2.5 text-sm text-fuchsia-800">
          <Icon name="info" size={15} /> Demo mode is on — some results are clearly-labelled <strong>demo data</strong>, not real searches.
        </p>
      )}
      {!s.demo && s.sourcesSearched === 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <Icon name="alert" size={15} /> No source performed a live query for this search type. Configure ABN Lookup and a web-search key — or use the official links in the source trail.
        </p>
      )}

      {/* RESULT TABS */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Result sections">
        {tabs.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActive(id)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
              activeTab === id ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-ink-muted hover:border-slate-300 hover:text-ink"
            }`}
          >
            {tabLabel(id)}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            {report.identity && <IdentityPanel id={report.identity} confidence={top?.confidence} />}

            <Panel title="Possible matches" sub="Records that may describe the same entity, ranked by identity confidence." pill={<StatusPill tone={top ? "good" : "neutral"}>{candidates.length} found</StatusPill>}>
              {candidates.length ? (
                <div className="space-y-3">
                  {candidates.map((c, i) => (
                    <CandidateRow key={c.id} c={c} rank={i + 1} />
                  ))}
                  <p className="text-xs text-ink-muted">Confidence = how likely these records describe the same entity, not whether they can be trusted.</p>
                </div>
              ) : (
                <EmptyState text="No single confident match was assembled from the sources searched. Review the source trail and official links." />
              )}
            </Panel>

            {webProvider && webTop.length > 0 && (
              <Panel title="Top web references" sub="Best public matches for the details you gave." pill={<StatusPill tone="good">{webTop.length} match{webTop.length === 1 ? "" : "es"}</StatusPill>}>
                <div className="grid gap-2">
                  {webTop.slice(0, 5).map((it, i) => (
                    <RefRow key={i} item={it} />
                  ))}
                </div>
                <button onClick={() => setActive("digital")} className="mt-3 text-sm font-bold text-brand-600 hover:underline">
                  See all {webProvider.results.length} web references →
                </button>
              </Panel>
            )}

            <Panel title="Key findings" sub="Signals worth seeing before opening every source." pill={<StatusPill tone="neutral">{findings.length} signals</StatusPill>}>
              {findings.length ? (
                <div className="space-y-2.5">
                  {findings.map((f, i) => (
                    <Signal key={i} tone={f.tone} title={f.title} body={f.body} />
                  ))}
                </div>
              ) : (
                <EmptyState text="No source returned results for this search. Try adding matching details, or configure the sources noted below." />
              )}
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="What was checked" sub="Live queries and official-source links for this search." pill={<StatusPill tone="good">{report.providers.length} sources</StatusPill>}>
              <div className="grid gap-2">
                {report.providers.map((p) => (
                  <div key={p.provider} className="flex items-center gap-2 text-sm">
                    <Icon name={p.status === "complete" && p.dataOrigin !== "link" ? "check" : p.status === "not_configured" ? "alert" : "clock"} size={15} className={p.status === "complete" && p.dataOrigin !== "link" ? "text-accent-600" : p.status === "not_configured" ? "text-amber-500" : "text-slate-300"} />
                    <span className="flex-1 truncate text-ink-soft">{p.providerLabel}</span>
                    <OriginBadge p={p} />
                  </div>
                ))}
              </div>
            </Panel>

            {doubleChecks.length > 0 && (
              <Panel title="Things to double-check" sub="Because a public record is evidence, not proof." pill={<StatusPill tone="warn">{new Set(doubleChecks).size}</StatusPill>}>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink-muted">
                  {[...new Set(doubleChecks)].map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* OPTIONAL DATA TABS — one panel per source; web search gets grouped result cards */}
      {OPTIONAL_TABS.map(
        (t) =>
          activeTab === t.id && (
            <div key={t.id} className="grid gap-5">
              {tabProviders[t.id].length ? (
                tabProviders[t.id].map((p) =>
                  p.category === "web" ? (
                    <Panel key={p.provider} title="Online presence & web references" sub={`${p.results.length} public result${p.results.length === 1 ? "" : "s"}, grouped by type.`} pill={<StatusPill tone="good">Live</StatusPill>}>
                      <WebReferences p={p} subject={subject} />
                    </Panel>
                  ) : (
                    <Panel key={p.provider} title={p.providerLabel} sub="Public-source findings for this search." pill={<OriginBadge p={p} />}>
                      <ProviderBlock p={p} />
                    </Panel>
                  ),
                )
              ) : (
                <EmptyState text="No findings in this section for this search." />
              )}
            </div>
          ),
      )}

      {/* SOURCE TRAIL */}
      {activeTab === "sources" && (
        <div className="space-y-5">
          {linkProviders.length > 0 && (
            <Panel title="Official sources to check" sub="Check First did not search these — one-click links to official registers and public searches you can open yourself.">
              <div className="grid gap-2 sm:grid-cols-2">
                {linkProviders.flatMap((p) =>
                  p.results.map((item, i) => (
                    <a key={`${p.provider}-${i}`} href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-ink-soft transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                      <span className="truncate">{item.title}</span>
                      <Icon name="external" size={13} className="shrink-0 text-brand-500" />
                    </a>
                  )),
                )}
              </div>
            </Panel>
          )}

          <Panel title="Source trail" sub="Every source checked, its origin, status and how long it took.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-bold">Source</th>
                    <th className="pb-2 font-bold">Origin</th>
                    <th className="pb-2 font-bold">Status</th>
                    <th className="pb-2 font-bold">Took</th>
                  </tr>
                </thead>
                <tbody>
                  {report.providers.map((p) => (
                    <tr key={p.provider} className="border-t border-slate-100">
                      <td className="py-2.5 pr-3 font-semibold text-ink-soft">
                        {p.sourceUrl ? (
                          <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
                            {p.providerLabel}
                          </a>
                        ) : (
                          p.providerLabel
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <OriginBadge p={p} />
                      </td>
                      <td className="py-2.5 pr-3 text-xs font-semibold text-ink-muted">{STATUS_LABEL[p.status]}</td>
                      <td className="py-2.5 text-xs text-slate-400">{typeof p.durationMs === "number" ? `${p.durationMs}ms` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      <p className="px-1 text-xs leading-relaxed text-ink-muted">
        Public information can be inaccurate, incomplete or out of date. Check First presents evidence from public sources so you can decide — it does not
        determine whether anyone is safe, honest or trustworthy, and it is not a criminal-history check.
      </p>
    </div>
  );
}

const STATUS_LABEL: Record<ProviderStatus, string> = {
  queued: "Queued",
  searching: "Searching",
  complete: "Results found",
  no_results: "No results",
  unavailable: "Unavailable",
  not_configured: "Not configured",
  error: "Error",
  rate_limited: "Rate limited",
};

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
      <div className="eyebrow text-ink-faint">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold tracking-tightest text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{note}</div>
    </div>
  );
}

function Signal({ tone, title, body }: { tone: "good" | "warn" | "info"; title: string; body: string }) {
  const icon = tone === "good" ? "check" : tone === "warn" ? "alert" : "info";
  const cls = tone === "good" ? "bg-accent-50 text-accent-600" : tone === "warn" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${cls}`}>
        <Icon name={icon} size={16} />
      </span>
      <div>
        <strong className="block text-[13px] text-ink">{title}</strong>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{body}</p>
      </div>
    </div>
  );
}

function CandidateRow({ c, rank }: { c: Candidate; rank: number }) {
  const tone = c.confidence >= 70 ? "bg-accent-500" : c.confidence >= 40 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Possible match {rank}
            {c.demo && <span className="ml-2 rounded bg-fuchsia-100 px-1.5 py-0.5 text-[9px] text-fuchsia-700">Demo</span>}
          </p>
          <h4 className="mt-0.5 text-base font-bold text-ink">{c.displayName}</h4>
          {c.subtitle && <p className="text-sm text-ink-muted">{c.subtitle}</p>}
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-ink">{c.confidence}%</div>
          <div className="text-[10px] font-medium text-slate-400">confidence</div>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${tone} transition-all duration-700`} style={{ width: `${c.confidence}%` }} />
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {c.evidence.map((e, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            {e.polarity === "match" && <Icon name="check" size={13} className="shrink-0 text-accent-600" />}
            {e.polarity === "conflict" && <Icon name="x" size={13} className="shrink-0 text-rose-500" />}
            {e.polarity === "unknown" && <span className="shrink-0 text-slate-300">?</span>}
            <span className={e.polarity === "conflict" ? "text-rose-700" : e.polarity === "unknown" ? "text-slate-400" : "text-ink-soft"}>{e.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
