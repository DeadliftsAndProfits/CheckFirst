# Check First — Project Charter

> **Know before you trust.** Check people and businesses using publicly available information.

## What this is

Check First is an Australian-first consumer verification platform. Ordinary people enter
what they know about a person or business and Check First searches **publicly available
information** to help them decide whether what they've been told matches independent public
records — before they date, hire, pay, meet, or trust.

The consumer never needs to understand OSINT, skip-tracing, APIs, Google dorks, datasets,
entity resolution, or confidence maths. It should feel as easy as a search engine.

## Source of truth

The authoritative product specification is the build brief supplied by the product owner
(the "CHECK FIRST — AUTONOMOUS MVP BUILD" document). This `/docs` folder is the working
project system: requirements traceability, roadmap, phase status, assumptions, provider
status, and test results. Every requirement in the brief maps to a phase in `ROADMAP.md`.

## GSD note (assumption A1)

The brief mandates the installed **GSD (Get Shit Done)** skill as the orchestration system.
GSD is **not installed** in this environment (no skill, plugin, or command exists on the
machine, and it is absent from the available-skills list). Per the brief's own guidance for
missing pieces (§0.2/§0.3: "choose the safest reasonable MVP default, record the assumption
and continue"), we run the identical loop — PLAN → IMPLEMENT → RUN → TEST → INSPECT → FIX →
RETEST → VERIFY → COMPLETE — using this `/docs` system for planning, phase tracking, and
context persistence. See `ASSUMPTIONS.md` A1.

## Product principles

- **Evidence, not verdicts.** We present what public sources say and how confident we are
  that records refer to the same entity. The user decides what it means. Never "safe",
  "dangerous", "criminal", "clean record", "trust score", "scam".
- **Honest failure.** A provider without credentials returns `not_configured`; a provider
  that errors returns `error`. The UI shows this truthfully. We never silently substitute
  fake results for real ones.
- **Confidence = identity-match confidence**, i.e. how confident we are that multiple
  records describe the same person/business — NOT trustworthiness.
- **Privacy by design.** Minimal collection, short retention, server-side secrets, SSRF
  guards, no dossier database of searched people.

## Tech stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — SPA-feel frontend + server route
  handlers that keep API keys server-side and run provider fan-out.
- **Tailwind CSS** — premium, accessible, responsive UI.
- **Vitest + jsdom** — unit & integration tests. **Playwright** — E2E (desktop + mobile).
- Streaming search via NDJSON from a POST route so provider states update live.

## Key user question

> Does what this person or business has told me match independently available public information?
