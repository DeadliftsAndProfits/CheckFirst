"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SearchInput } from "@/types/core";
import { useSearch } from "@/components/search/useSearch";
import { SearchLoading } from "@/components/search/SearchLoading";
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
      if (input.state) parts.push(input.state);
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
  const [panel, setPanel] = useState<null | "edit" | "new">(null);
  // The loading animation must play to completion before results are revealed.
  const [loadingDone, setLoadingDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const pending = readPendingSearch();
    if (pending) {
      setInput(pending);
      search(pending);
    } else {
      setPanel("new");
    }
  }, [search]);

  const runNew = (next: SearchInput) => {
    setPendingSearch(next);
    setInput(next);
    setPanel(null);
    setLoadingDone(false);
    reset();
    search(next);
  };
  const newSearch = () => {
    clearPendingSearch();
    reset();
    setInput(null);
    setLoadingDone(false);
    setPanel("new");
  };

  const summary = input ? summarise(input) : null;
  const report = state.report;
  // Show the loading view while searching AND until its animation has completed.
  const showLoading = state.phase === "searching" || (state.phase === "done" && !loadingDone);
  const showResults = state.phase === "done" && loadingDone && !!report;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/60 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Check First home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {input && (
              <button onClick={() => setPanel((p) => (p === "edit" ? null : "edit"))} aria-expanded={panel === "edit"} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-slate-50">
                <Icon name="edit" size={15} /> Edit search
              </button>
            )}
            <button onClick={newSearch} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-0.5">
              <Icon name="plus" size={15} /> New search
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {panel === "new" && (
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-7">
            <h1 className="text-xl font-bold text-ink">New search</h1>
            <p className="mt-1 text-sm text-ink-muted">Choose what to check and enter what you know. The search runs right here.</p>
            <div className="mt-5">
              <SearchForm advanced submitLabel="Search" onSubmit={runNew} autoFocus />
            </div>
          </div>
        )}

        {panel !== "new" && input && summary && (
          <>
            {panel !== "edit" && (
              <nav className="mb-5 text-sm text-ink-muted" aria-label="Breadcrumb">
                Searches / {input.type[0].toUpperCase() + input.type.slice(1)} / <span className="font-semibold text-ink">{summary.title}</span>
              </nav>
            )}

            {panel === "edit" && (
              <div className="mb-6 animate-fade-up rounded-3xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold text-ink">Edit search</h2>
                  <button onClick={() => setPanel(null)} aria-label="Close edit" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                    <Icon name="x" size={18} />
                  </button>
                </div>
                <SearchForm advanced initial={input} submitLabel="Update search" onSubmit={runNew} serverErrors={state.fieldErrors} />
              </div>
            )}

            {state.phase === "error" && (
              <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="alert" size={17} /> {state.error ?? "The search could not be completed."}
                </p>
                <button onClick={() => setPanel("edit")} className="mt-3 text-sm font-bold text-brand-700 hover:underline">
                  Edit your search and try again
                </button>
              </div>
            )}

            {state.phase !== "error" && showLoading && (
              <div className="rounded-4xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
                <SearchLoading state={state} subject={summary.title} phase={state.phase} onDone={() => setLoadingDone(true)} />
              </div>
            )}

            {showResults && <Results report={report!} candidates={state.candidates} subject={summary.title} />}
          </>
        )}
      </main>
    </div>
  );
}
