# Changelog

All notable changes to Check First are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] — 2026-08-11

### Added
- **Brave Search** as a web-search provider (`BRAVE_SEARCH_API_KEY`). It's the recommended way to
  make "Public web search" LIVE — real whole-web results, a free tier, one key, and none of the
  Google Cloud project/enable/OAuth setup. The provider now prefers Brave, then Google CSE, then
  Bing. Verified end-to-end: a business search returns real web references via Brave (origin=LIVE).

### Notes
- Google Programmable Search no longer offers whole-web for new engines (Jan 2026); it's limited to
  ~50 domains. Bing's search API was retired in 2025. Brave is the simplest real-search path.

## [0.5.1] — 2026-08-11

### Changed
- The search loading animation now always plays through to completion before results appear.
  Source rows reveal in sequence and the progress bar fills to 100%, then the report is shown —
  so fast searches (which the backend finishes in milliseconds) no longer flash straight past the
  radar view. A row is still never shown complete before its real provider has actually settled,
  and slow real-network searches (e.g. website checks) continue to pace naturally. Respects
  reduced-motion. `/search` reveals results only once the animation signals it has finished.

## [0.5.0] — 2026-08-11

Search loading + results experience rebuilt to match the "mockup v3" interactive design — a radar
loading view and a tabbed identity report — but driven entirely by our **real report data** with
the honest LIVE / LINK / NEEDS-CONFIG / DEMO classification preserved (the mockup's fictional demo
records never enter production). Verified: lint, typecheck, 58 unit+integration, prod build, 22
Playwright E2E (desktop + mobile), screenshots.

### Added
- `SearchLoading` — a radar loading view (sweeping scanner, subject initials, stage label, progress
  bar) with animated source-status rows mapped to the **real streaming providers**, each showing its
  origin badge and Queued → Searching → Complete state.
- Rebuilt `Results` in the mockup's premium style: a navy identity hero (avatar, name, corroborating
  signals, honest badges), a **confidence score ring** (top candidate, or "—/No confident match"),
  a four-card summary strip (real counts), and pill **result tabs** — Overview / Contact & digital /
  Business links / Licences / Digital footprint / Source trail — that only appear when a section has
  real findings. Overview shows possible matches, key findings (derived from real provider outcomes),
  "what was checked", and things to double-check.

### Changed
- `/search` now flows loading → results (radar while searching, then the tabbed report). The subject
  is shown once as a breadcrumb + hero (removed the redundant page-level heading).
- Confidence, evidence, badges, findings and counts are computed only from real (or clearly-labelled
  demo) provider results — no fabricated fields from the mockup were carried over.

### Removed
- The previous `LiveProgress` component (superseded by `SearchLoading`).

## [0.4.0] — 2026-08-11

Premium visual overhaul of the front end. Pure presentation layer — no product logic, routes,
search behaviour, forms or functionality changed. All 22 Playwright E2E, 58 unit+integration
tests, lint, typecheck and the production build pass; verified at desktop, tablet and mobile.

### Added
- A proper design system: navy / electric-blue / teal-aqua token palette, premium shadow scale
  (soft / card / lift / glow), larger radii, refined typography and motion tokens in Tailwind, plus
  CSS design tokens and reusable utilities (`text-gradient`, `glass`, `eyebrow`, entrance reveals).
- Abstract "public-source correlation" graphic (`SourceGraph`) for a new dark intelligence section —
  illustrative only, no data claims.
- Distinct visual identity per section: source-credibility strip, connected 3-step process flow,
  capability grid with hover states, personality use-case cards, dark intelligence band, privacy
  "trust architecture" split, refined FAQ accordion, and a strong dark gradient final CTA.

### Changed
- Hero: dramatically larger gradient headline, refined trust indicators, and a premium elevated
  search panel ("Start a trust search") as the page's visual focal point.
- Search form: refined segmented tabs with an unmistakable active state, larger inputs with premium
  focus rings, a gradient submit, and the optional fields restyled as a clearly-secondary nested
  "matching layer" with animated expansion.
- Navigation: translucent glass sticky header with a gradient primary CTA.
- Page rhythm now alternates light and dark surfaces instead of repeating identical white cards.
- `/search` workspace inherits the new tokens (glass header, premium form) for a cohesive look.

### Preserved
- All five search tabs, optional matching details, multi phone/email inputs, FAQ accordions,
  navigation anchors, the hero→/search handoff, New/Edit search, and demo/real search behaviour.

## [0.3.0] — 2026-08-10

Integrity round — make the search real and represent every source honestly. Backend providers,
orchestration, entity resolution and confidence were preserved; the honesty model, two new live
providers, progressive results and the New/Edit search workflow were added. Verified with an audit
(`PROVIDER_AUDIT.md`), lint, typecheck, 58 unit+integration tests, a production build, 22 Playwright
E2E tests, real per-provider network inspection, and screenshots.

### Added
- `PROVIDER_AUDIT.md` — evidence-based classification of every provider (LIVE / LINK / REQUIRES
  CONFIG / DEMO / UNAVAILABLE) with real timing and endpoint tests.
- `dataOrigin` on every provider result (live / local_dataset / cached / link / demo / none) and a
  real `durationMs`, surfaced as LIVE / LINK / NEEDS CONFIG / DEMO badges and a `TOOK` column.
- **Gravatar** provider (real, no credentials) — email → public profile/avatar lookup.
- **Website content** provider (real, no credentials) — SSRF-guarded homepage fetch extracting
  title/meta and any displayed ABN/ACN (flagged to verify against the authoritative ABR).
- Progressive results: partial results render as providers settle; honest final summary
  ("N searched · N returned · N no results · N need configuration · N official links").
- Advanced search form on `/search` (all fields inline + optional phone/email context) reused by
  both New search and Edit search. Optional name/business/location context now works for phone &
  email searches.
- `integrity.test.ts` — proves a default (demo-off) search contains no fixtures and that
  link-generators are classified as links, not searched sources.

### Changed
- **`CHECKFIRST_DEMO_MODE` now defaults OFF.** Default/production searches never use fixtures;
  demo data only appears when demo mode is explicitly enabled (and is always badged).
- Link-generators (`searchlinks`, `courts`, `licences`, `professional`) are reclassified as
  `link` and shown in a separate "Official sources to check" section, excluded from result counts.
- **New search** stays on `/search` with a blank advanced form (no longer returns to the homepage);
  previous results are cleared. **Edit search** keeps results visible and re-runs on update.
- Person hero form: First · Last / Known location · State / Approximate age (State is its own
  dropdown). Business hero default drops Suburb (State only); suburb moves to optional.
- Phone & Email inputs always occupy a half-width column (2-col grid) from the first field.
- Confidence and entity resolution now operate purely on real provider signals (no fixture inflation).

### Fixed
- Normal searches silently surfacing demo/fixture candidates as if real (demo defaulted on).
- Search completing in ~6ms with fabricated-looking "results" — those were link-generators; real
  searches (website/email) now show genuine multi-hundred-ms to multi-second durations.

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
