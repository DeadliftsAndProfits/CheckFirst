"use client";

import { useCallback, useRef, useState } from "react";
import type { SearchInput, SearchEvent, ProviderResult, Candidate, SearchReport } from "@/types/core";

export type Phase = "idle" | "searching" | "done" | "error";

export interface LiveState {
  phase: Phase;
  /** Provider id → latest result (or a queued placeholder). */
  providers: Map<string, ProviderResult>;
  /** Ordered list of provider ids as announced in meta. */
  order: string[];
  meta?: Extract<SearchEvent, { kind: "meta" }>;
  candidates: Candidate[];
  report?: SearchReport;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const initial: LiveState = { phase: "idle", providers: new Map(), order: [], candidates: [] };

export function useSearch() {
  const [state, setState] = useState<LiveState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initial);
  }, []);

  const search = useCallback(async (input: SearchInput) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState({ phase: "searching", providers: new Map(), order: [], candidates: [] });

    let res: Response;
    try {
      res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: ac.signal,
      });
    } catch (e) {
      if (ac.signal.aborted) return;
      setState((s) => ({ ...s, phase: "error", error: "Could not reach the server." }));
      return;
    }

    if (res.status === 422) {
      const body = await res.json().catch(() => ({}));
      setState({ phase: "error", providers: new Map(), order: [], candidates: [], error: "Please fix the highlighted fields.", fieldErrors: body.fields });
      return;
    }
    if (res.status === 429) {
      setState({ phase: "error", providers: new Map(), order: [], candidates: [], error: "Too many searches. Please wait a moment and try again." });
      return;
    }
    if (!res.ok || !res.body) {
      setState({ phase: "error", providers: new Map(), order: [], candidates: [], error: "Search failed. Please try again." });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handle = (ev: SearchEvent) => {
      setState((s) => {
        const next: LiveState = { ...s, providers: new Map(s.providers), order: [...s.order] };
        switch (ev.kind) {
          case "meta":
            next.meta = ev;
            next.order = ev.providerList.map((p) => p.provider);
            for (const p of ev.providerList) {
              next.providers.set(p.provider, {
                provider: p.provider,
                providerLabel: p.providerLabel,
                category: p.category,
                status: "searching",
                query: "",
                timestamp: new Date().toISOString(),
                results: [],
                sourceClass: "discovery",
                warnings: [],
              });
            }
            break;
          case "provider":
            next.providers.set(ev.result.provider, ev.result);
            break;
          case "candidates":
            next.candidates = ev.candidates;
            break;
          case "report":
            next.report = ev.report;
            next.phase = "done";
            break;
          case "fatal":
            next.phase = "error";
            next.error = ev.message;
            break;
        }
        return next;
      });
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            handle(JSON.parse(line) as SearchEvent);
          } catch {
            /* ignore malformed line */
          }
        }
      }
      setState((s) => (s.phase === "searching" ? { ...s, phase: "done" } : s));
    } catch {
      if (!ac.signal.aborted) setState((s) => ({ ...s, phase: "error", error: "The search was interrupted." }));
    }
  }, []);

  return { state, search, reset };
}
