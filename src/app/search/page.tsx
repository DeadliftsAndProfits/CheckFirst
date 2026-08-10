"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SearchInput } from "@/types/core";
import { useSearch } from "@/components/search/useSearch";
import { LiveProgress } from "@/components/search/LiveProgress";
import { Results } from "@/components/search/Results";
import { SearchForm } from "@/components/search/SearchForm";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { readPendingSearch, setPendingSearch, clearPendingSearch } from "@/lib/client/searchStore";

function summarise(input: SearchInput): { title: string; parts: string[] } {
  const parts: string[] = [];
  let title = "your search";
  switch (input.type) {
    case "person":
      title = [input.firstName, input.lastName].filter(Boolean).join(" ") || "this person";
      if (input.suburb || input.state) parts.push([input.suburb, input.state].filter(Boolean).join(" "));
      if (input.ageBand && input.ageBand !== "Not sure") parts.push(`Age ${input.ageBand}`);
      if (input.employer) parts.push(input.employer);
      break;
    case "business":
      title = input.businessName || (input.abn ? `ABN ${input.abn}` : "this business");
      if (input.abn) parts.push(`ABN ${input.abn}`);
      if (input.acn) parts.push(`ACN ${input.acn}`);
      if (input.suburb || input.state) parts.push([input.suburb, input.state].filter(Boolean).join(" "));
      break;
    case "phone":
      title = (input.phones ?? [input.phone]).filter(Boolean).join(", ") || "this number";
      break;
    case "email":
      title = (input.emails ?? [input.email]).filter(Boolean).join(", ") || "this address";
      break;
    case "website":
      title = input.website || "this website";
      break;
  }
  return { title, parts };
}

export default function SearchPage() {
  const router = useRouter();
  const { state, search, reset } = useSearch();
  const [input, setInput] = useState<SearchInput | null>(null);
  const [editing, setEditing] = useState(false);
  const started = useRef(false);

  // On mount: pick up the pending search and auto-start it.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const pending = readPendingSearch();
    if (pending) {
      setInput(pending);
      search(pending);
    }
  }, [search]);

  const runNew = (next: SearchInput) => {
    setPendingSearch(next);
    setInput(next);
    setEditing(false);
    reset();
    search(next);
  };

  const newSearch = () => {
    clearPendingSearch();
    router.push("/");
  };

  const summary = input ? summarise(input) : null;
  const busy = state.phase === "searching";
  const report = state.report;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Check First home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {input && (
              <button
                onClick={() => setEditing((v) => !v)}
                aria-expanded={editing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50"
              >
                <Icon name="edit" size={15} /> Edit search
              </button>
            )}
            <button
              onClick={newSearch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Icon name="plus" size={15} /> New search
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* No pending search (direct/refresh with empty storage). */}
        {!input && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h1 className="text-xl font-bold text-ink">Start a search</h1>
            <p className="mt-1 text-sm text-ink-muted">Enter what you know and Check First will check public sources.</p>
            <div className="mt-4">
              <SearchForm submitLabel="Check first" onSubmit={runNew} />
            </div>
          </div>
        )}

        {input && summary && (
          <>
            {/* Search header */}
            <div className="mb-5">
              <p className="text-sm font-medium text-ink-muted">Checking</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{summary.title}</h1>
              {summary.parts.length > 0 && <p className="mt-1 text-ink-muted">{summary.parts.join(" · ")}</p>}
            </div>

            {/* Edit panel */}
            {editing && (
              <div className="mb-6 animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-ink">Edit search</h2>
                  <button onClick={() => setEditing(false)} aria-label="Close edit" className="rounded p-1 text-slate-400 hover:bg-slate-100">
                    <Icon name="x" size={18} />
                  </button>
                </div>
                <SearchForm initial={input} submitLabel="Update search" onSubmit={runNew} serverErrors={state.fieldErrors} />
              </div>
            )}

            {state.phase === "error" && (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
                <p className="flex items-center gap-2 font-medium">
                  <Icon name="alert" size={17} /> {state.error ?? "The search could not be completed."}
                </p>
                <button onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-brand-700 hover:underline">
                  Edit your search and try again
                </button>
              </div>
            )}

            {/* Active search — full width */}
            {busy && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <LiveProgress state={state} />
              </div>
            )}

            {/* Results — full workspace width, two columns on large screens */}
            {report && state.phase === "done" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Results report={report} candidates={state.candidates} />
                </div>
                <aside className="space-y-4 lg:col-span-1">
                  <div className="sticky top-20 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">At a glance</h3>
                      {state.candidates[0] ? (
                        <div className="mt-3">
                          <div className="text-3xl font-bold text-ink">{state.candidates[0].confidence}%</div>
                          <div className="text-xs font-medium text-slate-400">identity confidence · {state.candidates[0].displayName}</div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-ink-muted">No single confident match — review the evidence below.</p>
                      )}
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <Stat n={report.summary.sourcesChecked} label="sources" />
                        <Stat n={report.summary.references} label="references" />
                        <Stat n={state.candidates.length} label="candidates" />
                      </dl>
                    </div>
                    {report.notices.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <h3 className="mb-1 text-sm font-semibold text-amber-800">Notes</h3>
                        <ul className="space-y-1 text-xs text-amber-900">
                          {report.notices.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className="text-lg font-bold text-ink">{n}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
