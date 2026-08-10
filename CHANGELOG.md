# Changelog

All notable changes to Check First are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-08-10

Round 2 UX revision. The search backend, providers, orchestration, entity resolution and
confidence engine were preserved; the frontend flow was restructured and the search schema
extended. Verified with lint, typecheck, 55 unit+integration tests, a production build, and
20 Playwright E2E tests (desktop + mobile), plus screenshot-based visual inspection.

### Added
- Dedicated **`/search`** workspace that uses the full application width: a "Checking …" header,
  full-width live active-search, a two-column report (main results + sticky "At a glance" aside
  with confidence, stat tiles and notes), and **Edit search** / **New search** controls.
- Hero → search **navigation handoff**: pressing *Check first* stores the payload client-side
  (memory + sessionStorage, never in the URL) and auto-starts the investigation on `/search` —
  no second submission required (`src/lib/client/searchStore.ts`, `HeroSearch`, `app/search`).
- **Dynamic multi-input** for Phone and Email: half-width fields with add `[+]` / remove `×`
  controls (max 5), values preserved, empty entries ignored; all values reach the backend.
- Multiple-phone / multiple-email support in the schema: `phones[]`, `emails[]`, plus `ageBand`
  on `SearchInput`; validation, query generation, HIBP, confidence and the API all updated.
- **Approximate age** bands (Not sure / Under 18 / 18–24 / … / 75+) and a compact **Known
  location** (suburb + state) control on the Person form.
- Independent-corroboration bonus in the confidence engine: multiple corroborated contacts raise
  identity confidence only when a candidate record independently carries them (§16).
- New brand mark and favicon: white tile, black magnifying glass, green tick
  (`src/components/Logo.tsx`, `src/app/icon.svg`).
- Tests: multi-contact schema + corroboration unit tests; E2E for the hero→/search journey,
  form layouts, and multi-input add/remove/persist.

### Changed
- The hero search card is now an **entry** tool only; the investigation and results render on the
  dedicated `/search` page rather than inside the hero card.
- **Person** default fields: First name · Last name · Known location · Approximate age (all prior
  optional fields retained behind "Add optional matching details").
- **Business** default simplified to Business/company name · ABN/ACN (combined, routed by digit
  count) · Location; website/phone/email/ACN/postcode moved behind optional disclosure.
- Hero form given a minimum height for visual stability across tabs (measured 275–299px).
- HIBP breach-status provider now checks every supplied email address.

### Fixed
- Suburb input collapsing to ~26px on the Person/Business "Known location" control — the State
  `<select>` was inheriting `w-full` and overriding its fixed width.

## [0.1.0] — 2026-08-10

Initial working MVP — a genuinely functional Australian consumer public-information verification
platform. Installs, builds, starts, and runs; five search modes work end-to-end through a real
streaming backend. Verified with lint, typecheck, 47 unit+integration tests, a production build,
12 Playwright E2E tests, and adversarial + SSRF testing.

### Added
- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind foundation; Vitest + Playwright.
- Five search modes — Person, Business, Phone, Email, Website — with a polished consumer landing
  page (hero, how-it-works, what-we-check, privacy, FAQ) and an interactive hero search card.
- Input validation & normalisation: Australian phone equivalence, email, ABN/ACN official
  checksums, URL/domain, and unicode-aware names.
- Modular provider contract, registry, and a streaming search orchestrator (concurrent execution,
  per-provider timeout, graceful failure, overall timeout) exposed over an NDJSON POST route.
- Real zero-credential providers: DNS/MX/SPF/DMARC, TLS certificate, Certificate Transparency
  (crt.sh), RDAP domain registration, and legitimate one-click discovery links (social, AustLII,
  QBCC, NSW Fair Trading, Ahpra, ASIC).
- Credential-gated providers that report `not_configured` honestly (never faked): ABN Lookup
  (ABR), Google/Bing web search, Have I Been Pwned breach-status.
- Query-generation engine, entity resolution (only strong identifiers merge records — identical
  names never merge), and a transparent confidence engine (identity-match, not trustworthiness)
  with explicit evidence.
- Real-time live search experience wired to actual provider states, and a provenance-rich report
  (candidates, category sections, "things to double-check", sources table).
- Privacy & security controls: SSRF guard (blocks localhost/loopback/private/link-local/metadata
  incl. DNS rebinding), in-memory rate limiting, input caps, security headers, server-side secrets.
- Demo fixtures clearly badged "Demo data", active only when `CHECKFIRST_DEMO_MODE=true`.
- Project documentation: `HANDOVER.md`, `README.md`, and `/docs` (charter, roadmap/traceability,
  assumptions, provider register, blockers). `.env.example` documenting every integration.

### Notes
- Get Shit Done (GSD) orchestration was mandated but is not installed in this environment; the
  same PLAN→IMPLEMENT→RUN→TEST→VERIFY loop was run using the file-based `/docs` system instead
  (see `docs/ASSUMPTIONS.md` A1).
