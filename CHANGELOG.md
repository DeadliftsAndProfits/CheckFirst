# Changelog

All notable changes to Check First are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] — 2026-09-14

### Changed
- **Person web sub-query strategy V2** — redesigned `generateQueries()` for Person searches so each
  query tests a **materially distinct claim** and semantic duplicates are removed (router, cache,
  fallback, structured providers and confidence are untouched):
  - **Name + employer/context:** one strong quoted query `"Name" "Employer" State` (removed the old
    weaker duplicates `Name Employer`, `"Name" Employer`, `Name Employer linkedin`).
  - **Location:** a separate `"Name" Suburb State` query (independent claim).
  - **LinkedIn:** one query using the strongest available context (employer → location → name).
  - **Bare name:** now a **fallback only** — omitted when stronger context (employer/location) exists.
  - **Email:** exact address only — removed the automatic local-part/handle search.
  - **Username:** now generates an exact `"username"` web query (previously discovery-links only).
  - **Australian phone:** the three canonical representations (`0412345678`, `0412 345 678`,
    `+61412345678`) are preserved as **separate exact queries**.
- **Phone Boolean-OR rejected on evidence (§9).** Empirically tested Brave: a bare-digit query
  returned 10 results while the `"…" OR "…" OR "…"` form returned **0** — Boolean OR destroys results
  for quoted numeric phrases. Per the milestone's validation gate, phone uses separate queries on
  every engine (no per-engine divergence; no router change needed).
- **Per-investigation diagnostics** now expose the Person query **plan** (logical signals vs physical
  provider queries, with a per-signal breakdown) on `report.diagnostics.plan`.

- **Identity matcher V2 — candidate/investigation-level correlation** (`src/lib/identity.ts`). The
  V2 query redesign exposed that the matcher required all evidence on the single result that
  supplied the profile. Now:
  - A public profile (e.g. LinkedIn) establishes a candidate from **name/profile** evidence without
    the finding query needing to contain the employer.
  - **Employer / location / contact** signals may come from a **separate** result for the same
    candidate and raise confidence. A supplied value is corroborated **only when it actually appears
    in a result/snippet** — never merely because it was in the search query that returned the result
    (so `"Sam Magee" QLD` returning a profile does not, by itself, corroborate QLD; it stays
    "as provided").
  - Equivalent profile URLs across **regional hosts** (`www.`/`au.`/`uk.` `linkedin.com/in/<slug>`)
    canonicalise to **one** candidate, not several.
  - Matching stays **conservative**: name alone is never a strong match; a name-only/AU-only profile
    is capped as a *possible* match; an employer that **disagrees** with the profile lowers confidence.
  - Restores the flagship Sam Magee / Panthera Finance / QLD search to the top candidate with his
    real AU LinkedIn profile found. Confidence is an honest **55%** ("possible match"): the profile
    matches by name on an AU host, but nothing in the results independently corroborates QLD or the
    employer, so both remain "as provided".

### Notes
- Business, Website, Phone-type and Email-type search grammars were **not** changed (out of scope).
  The historical generator behaviour is recorded in `WEB_QUERY_AUDIT.md`.
- Observation for a future query tweak: like the phone Boolean-OR, the **double-quoted employer**
  query (`"Name" "Employer" State`) is empirically strict on Brave (returned 0 for the Sam Magee
  case). Unquoting the employer may improve employer corroboration; deferred (not in this scope).

## [0.8.0] — 2026-09-13

### Added
- **Multi-provider web-search router** (`src/lib/websearch/`) over three RAW web-search engines —
  **Brave → You.com → Tavily** (order via `SEARCH_PROVIDER_ORDER`):
  - **Sticky provider per investigation** — one engine serves all of a search's queries.
  - **Operational fallback only** — falls back to the next engine on rate-limit / quota / timeout /
    outage / config failure, **never** because results are weak or empty (a zero-result search is a
    success). **Mid-investigation fallback** retries only the failed queries on the next engine;
    successful queries are never re-run.
  - **Cache-before-API** (in-memory, per-kind TTL) so re-running or editing a search reuses results
    and spends no credits; **URL canonicalisation + de-duplication**; full **provenance** (engine,
    query, retrieved-at, cache status) on every result.
  - **Raw search only** — Tavily `search_depth:"basic", include_answer:false`; You.com Web Search
    endpoint only (never Answer/Research). No LLM in the loop.
  - **Per-engine usage tracking + cooldown** and **per-investigation diagnostics** (selected
    provider, queries generated/executed, cache hits, API calls consumed, fallbacks) — logged and
    attached to `report.diagnostics`.
  - New env: `YOU_SEARCH_API_KEY`, `TAVILY_API_KEY`, `SEARCH_PROVIDER_ORDER`,
    `SEARCH_QUERY_SAFETY_MAX`, per-engine `*_SEARCH_ENABLED`, `SEARCH_CACHE_TTL_SECONDS`.
- **`WEB_QUERY_AUDIT.md`** — a full audit of the existing sub-query generator (per search type,
  templates, counts, examples) to inform a later query-strategy milestone.

### Changed
- Removed the arbitrary **4-query execution cap** in the web-search provider. Web query count is now
  driven by the user's distinct signals and bounded only by the configurable circuit-breaker
  `SEARCH_QUERY_SAFETY_MAX` (default 12), which **logs** any truncation. The sub-query generator
  itself was **audited but deliberately not redesigned** this milestone.
- Google CSE / Bing are no longer part of the web-search path (Google CSE is being retired
  Jan 2027); they remain as dormant legacy config only.

## [0.7.0] — 2026-09-12

### Added
- **Free breach-status coverage — no API key required.** Two new public breach-index providers now
  run for every user on the free product:
  - **XposedOrNot** (`xposedornot`) — reports the names, dates, record counts and exposed data
    *types* of breaches an email appears in.
  - **LeakCheck public API** (`leakcheck`) — reports how many known breaches an email appears in,
    the source names/dates, and the exposed data *types*.
  - Both surface only breach *metadata* — never passwords, credentials, or leaked values — matching
    the existing HIBP provider's discipline, and carry the "reflects third-party incidents, not this
    person's conduct" warning.
- Breach providers are ordered free-first in the registry; the paid **Have I Been Pwned** provider
  stays available but dormant (`not_configured`) unless an `HIBP_API_KEY` is ever supplied.

### Notes
- Have I Been Pwned has no free tier for account lookups, so it now reports "not checked" by design;
  live breach results come from the two free indexes above.

## [0.6.0] — 2026-08-11

### Added
- **Identity synthesis** — person and business searches now assemble a single best-fit identity
  from the details you provided, corroborated by the discovered public data, instead of dumping
  links:
  - A new **Identity summary** panel echoes your search parameters (name, employer, location,
    phone…) and enriches them — e.g. a role/occupation extracted from the matched LinkedIn — each
    tagged "corroborated · N sources", "from LinkedIn", or "as provided".
  - The synthesised identity is the **top candidate**, with a real confidence score and evidence
    (e.g. "LinkedIn profile corroborates the name + employer").
  - The **best-matching public profile** is picked out and highlighted (AU-domain + name + employer
    aware), and a "… profile found" badge appears on the hero.
- Web results are now split into **"likely this subject"** (name + employer/location corroborated)
  vs a collapsed **"other people with this name"**, so same-name strangers no longer dominate.
- In-memory web-search **query cache** (15 min) so re-running or editing a search doesn't spend
  Brave/Google credits again.

### Fixed
- Hid the "We cannot provide a description for this page" placeholder some engines return for
  profile pages (e.g. LinkedIn).

## [0.5.4] — 2026-08-11

### Fixed
- **Person searches now actually find the right person.** The query generator was over-quoting
  (e.g. `"Name" "Employer"`), which made search engines return almost nothing, and only the first 3
  (weakest) queries ran. It now leads with name + distinguishing context (employer/business/
  occupation) — unquoted, quoted, and LinkedIn-targeted forms — so a person's LinkedIn/profile
  surfaces reliably. The web-search provider runs more queries (4), returns more results (18), and
  spaces Brave calls to respect its free-tier rate limit.

## [0.5.3] — 2026-08-11

### Changed
- Web/online results now render as proper, grouped **search-result cards** — "Public profiles"
  (LinkedIn/Facebook/etc., badged), "Directories & listings", and "Web references" — showing the
  actual found pages (title, domain, snippet). The best few are surfaced on the Overview tab with a
  "see all" jump to the full "Online presence & web references" card.
- Social discovery is now **real found results instead of manual "go and search" link buttons**:
  when a web-search engine is configured, the redundant `searchlinks` social/search links are
  suppressed (the real results cover them).

### Fixed
- Stripped HTML tags and entities (`<strong>`, `&#x27;`, `&amp;`, …) from search-result snippets,
  which were rendering as literal text.

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
