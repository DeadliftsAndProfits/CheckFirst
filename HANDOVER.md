# Check First — HANDOVER

_Last updated: 2026-08-10._ Status reflects the actual repository state, verified by running it.

## Overall status

**A genuinely functional MVP.** The app installs, builds, starts, and runs. All five search
modes work end-to-end through a real streaming backend with concurrent providers, honest
failure states, entity resolution, a transparent confidence engine, and a full results/report
with provenance. Real (zero-credential) integrations return live data. Credential-gated
providers report `not_configured` honestly and are never faked.

This is not a mock-up: the search card drives a real `POST /api/search` NDJSON stream, provider
states are real, and DNS/TLS lookups hit the network.

## Round 2 UX changes (2026-08-10)

A focused UX revision — backend search, providers, orchestration, entity resolution and
confidence were **preserved**; the frontend flow was restructured and the schema extended.

- **Navigation / handoff.** The hero search card is now an *entry* tool. Pressing **Check first**
  validates, stores the payload client-side (in memory + sessionStorage — deliberately **not** in
  the URL, §10) via `src/lib/client/searchStore.ts`, and navigates to a dedicated **`/search`**
  workspace which **auto-starts** the investigation (no second submit). Files:
  `src/components/search/HeroSearch.tsx`, `src/app/search/page.tsx`.
- **`/search` workspace.** Full application width: a "Checking <subject>" header, full-width live
  active-search (real provider states via `LiveProgress`), then a two-column report (main results
  + sticky "At a glance" aside with confidence, stat tiles, and notes). **Edit search** (compact
  prefilled panel, preserves input) and **New search** (returns home) controls.
- **Person form.** Default now: First name · Last name · **Known location** (compact suburb + state
  control) · **Approximate age** (age bands: Not sure / Under 18 / 18–24 / … / 75+). All previous
  optional fields remain behind "Add optional matching details" and still reach the backend.
- **Business form.** Default simplified to Business/company name · **ABN / ACN** (combined field,
  routed to `abn` or `acn` by digit count) · **Location**. Website / Phone / Email / ACN / postcode
  moved behind optional disclosure.
- **Phone & Email — dynamic arrays.** Half-width inputs on desktop with a `[+]` add control
  (wraps to new rows), each added field removable (first is not), values preserved, max 5, empty
  entries ignored. All entered values are validated and **all reach the backend** (`phones[]` /
  `emails[]`). HIBP now checks every supplied email.
- **Multi-value correlation (§16).** Multiple corroborated phones/emails raise identity confidence
  via a per-extra-value bonus — but only when the *candidate record* independently carries them,
  never merely because the user typed several. Unit-tested.
- **Schema.** `SearchInput` gained `phones[]`, `emails[]`, `ageBand`; validation, query
  generation, HIBP, confidence, and the API `sanitise()` all updated. Singular `phone`/`email`
  remain supported (backwards compatible) and are merged into the arrays.
- **Hero height stability.** Form body has a min-height; measured tab heights are 275–299px across
  all five tabs (24px variance = the optional-details row) — no jarring reflow.
- **Logo.** New mark: white tile, black magnifying glass, green tick (`src/components/Logo.tsx` +
  `src/app/icon.svg` favicon). No prior mock-up asset existed in the repo, so it was built to spec.

**Round 2 verification:** lint ✔ · typecheck ✔ · 55 unit+integration ✔ (incl. new multi-contact &
corroboration tests) · prod build ✔ (6 routes, `/search` added) · **20 Playwright E2E ✔**
(desktop + mobile — form layouts, multi-input add/remove/persist, hero→/search auto-run journey
for Person and Website, New search). Visual inspection via real screenshots confirmed the Person
"Known location" layout (fixed a suburb-input collapse bug where the State `<select>` inherited
`w-full`), phone multi-input wrapping, the full-width report, and mobile stacking.

Round 2 known limitations: multi-value confidence lift only shows with real providers that attach
contact signals to candidates (demo/ABN attach business/ABN signals, not phones), so the effect is
mostly latent until web-search/HIBP keys are configured; the "Edit search" panel re-runs the whole
search rather than diffing.

## Round 3 — Real Search Status (2026-08-10)

Round 3 was an integrity round. The audit (`PROVIDER_AUDIT.md`) found that the shipped default had
`CHECKFIRST_DEMO_MODE` defaulting **on**, so normal searches silently included fixture candidates,
and that link-generators were being counted as "sources that returned results". Both are fixed.
Every provider result now carries a `dataOrigin` (live / local_dataset / cached / link / demo /
none) and a real `durationMs`, surfaced in the UI as LIVE / LINK / NEEDS CONFIG / DEMO badges and a
`TOOK` column. Verified by running the orchestrator against the live server (demo OFF) and testing
every external endpoint with curl.

**LIVE — tested, genuinely returning public data (no credentials):**
- `dns` — DNS/MX/SPF/DMARC/NS (real, ~60–130ms). Verified example.com, telstra.com.au.
- `tls` — SSL/TLS certificate (real, ~200ms). Verified real Telstra cert (DigiCert, "Telstra Limited", SANs).
- `webcontent` **(new R3)** — SSRF-guarded homepage fetch → title/meta + displayed ABN/ACN (real, ~444ms). Verified Telstra title.
- `gravatar` **(new R3)** — email → public Gravatar profile/avatar (real, ~810ms). Verified a real profile hit.
- `rdap` — domain registration (real; intermittently slow/`unavailable` on some ccTLDs — handled).
- `ct` — Certificate Transparency via crt.sh (real; crt.sh intermittently 404/502 → `unavailable`).

**REQUIRES CONFIGURATION — real implementation, one env var from LIVE:**
- `abn` (ABN Lookup / ABR) — needs free `ABR_GUID`. Verified endpoint rejects an empty GUID.
- `websearch` (Google CSE / Bing) — needs `GOOGLE_CSE_API_KEY`+`GOOGLE_CSE_CX` or `BING_SEARCH_API_KEY`.
- `hibp` (email breach status) — needs `HIBP_API_KEY`.

**LINK (not a search) — official-source discovery links, clearly labelled:**
- `searchlinks`, `courts`, `licences`, `professional`. Shown in an "Official sources to check"
  section; excluded from the "sources searched / references" counts.

**DEMO ONLY — explicit demo mode (`CHECKFIRST_DEMO_MODE=true`), default OFF:**
- `demo-identity`, `demo-business`, `demo-licence`. Never appear in a default/production search.

**LOCAL DATASET / CACHED:** architecture exists (`dataOrigin` supports both) but no dataset is
ingested yet — a documented future step for offline ABR/licence data.

### What this means per search type (default, no keys)
- **Website:** genuinely searches (DNS, TLS, RDAP, CT, webcontent) — several real LIVE queries.
- **Email:** genuinely searches (DNS on the domain, Gravatar); HIBP/web-search need keys.
- **Business / Person / Phone:** **no live query without `ABR_GUID` + a web-search key.** The UI
  says so honestly ("No source performed a live query for this search type") and offers official
  links. Add the two free/near-free keys to make these substantive.

### Round 3 search experience
- Progressive rendering: partial results appear as providers settle (verified — SSL cert showed
  while other providers were still "Searching"). Real perceived duration (website ~9s from real
  RDAP/CT latency; no artificial sleeps).
- Honest final summary: "N sources searched · N returned results · N no results · N need
  configuration · N official links."
- `New search` stays on `/search` with a blank advanced form; `Edit search` keeps results visible
  and re-runs on update. Both use one advanced `SearchForm` component.

### Round 3 verification
lint ✔ · typecheck ✔ · **58 unit+integration ✔** (incl. new `integrity.test.ts` proving a default
search contains no fixtures and link-classification) · prod build ✔ (6 routes) · **22 Playwright
E2E ✔** (desktop + mobile, incl. New/Edit search flows) · real network audit ✔ (per-provider
`dataOrigin` + `durationMs`) · screenshot visual inspection ✔.

### Round 3 known limitations
- Business/Person/Phone have no zero-credential LIVE provider yet — they depend on ABR + web-search
  keys. This is honest, not hidden.
- `rdap`/`ct` are third-party best-effort (ccTLD RDAP and crt.sh are intermittently unavailable).
- No dev-only provider debug panel was added as a separate UI (the Sources-checked table now shows
  origin, status and real duration, covering most of that need); a richer debug view remains a P1.
- `/search/{searchId}` session-URL model not adopted — the existing in-memory + sessionStorage
  handoff already keeps identifiers out of the URL safely (documented decision).
- `webcontent` only sees server-rendered HTML; SPA-only sites won't expose their content.

## Round 4 — Premium UI/UX redesign (2026-08-11)

A visual-only overhaul; no product logic, routes, schema, search behaviour or functionality
changed. Introduced a real design system (navy / electric-blue / teal-aqua tokens, premium
shadow/radius/motion scales in `tailwind.config.ts` + CSS tokens/utilities in `globals.css`),
redesigned the navigation (glass sticky), hero and search panel (the visual focal point, with a
clearly-secondary nested "optional matching" layer), and gave each landing section its own identity
— including a dark "intelligence" band with an abstract source-correlation graphic
(`src/components/marketing/SourceGraph.tsx`, illustrative only). The `/search` workspace inherits
the tokens for consistency. Verified: lint ✔ · typecheck ✔ · 58 unit+integration ✔ · prod build ✔ ·
**22 Playwright E2E ✔** (all tabs, optional details, FAQ, nav, New/Edit search preserved) ·
screenshots at desktop / tablet / mobile ✔. No functionality was changed or removed.

## Round 5 — Mockup-style loading & results (2026-08-11)

Adopted the interactive loading and results experience from the owner's "mockup v3", **driven by
real report data** — the mockup's fictional records were not carried into production. New
`SearchLoading` (radar scanner + progress + animated source rows wired to the real streaming
providers with LIVE/LINK/NEEDS-CONFIG/DEMO badges) and a rebuilt `Results` (navy identity hero +
confidence score ring + 4-card summary strip + pill result tabs: Overview / Contact & digital /
Business links / Licences / Digital footprint / Source trail). Tabs appear only when a section has
real findings; the score ring shows "—/No confident match" honestly when no candidate is assembled.
`/search` flows loading → results; `LiveProgress` was removed. Confidence, badges, findings and
counts derive only from real (or clearly-labelled demo) provider output. Verified: lint ✔ ·
typecheck ✔ · 58 unit+integration ✔ · prod build ✔ · **22 Playwright E2E ✔** (desktop + mobile) ·
screenshots of loading + person/website/mobile results ✔.

### What was NOT delivered as mandated
- **GSD orchestration.** The brief mandates the installed GSD skill. **GSD is not installed on
  this machine** (no skill/plugin/command; absent from the tool list). Rather than fabricate GSD
  commands, the identical PLAN→IMPLEMENT→RUN→TEST→VERIFY loop was run using a file-based project
  system in `/docs`. See `docs/ASSUMPTIONS.md` A1 and `docs/BLOCKERS.md` B1.

## What genuinely works (verified)

- Landing page: hero (left marketing / right interactive search card), How-it-works, What-we-check,
  Common uses, Privacy, FAQ, footer. Responsive desktop + mobile (Playwright Pixel-7 project passes).
- Five tabs (Person / Business / Phone / Email / Website); switching swaps form + validation.
- Person optional-details progressive-disclosure expander (§7).
- Client + server validation; server is authoritative (422 with per-field errors).
- Normalisation: AU phone equivalence, email, ABN/ACN official checksums, URL/domain, names
  (unicode/hyphen/apostrophe). Unit-tested.
- Streaming orchestrator: validate → normalise → generate queries → select providers → concurrent
  execution (cap 6, per-provider 11s timeout, overall 18s) → live provider states → candidates →
  report. One provider failing/timing-out never kills the search (verified against crt.sh 502 and
  RDAP timeout in live runs).
- Live search experience wired to **real** provider states (not a fake timer): per-source cards,
  progress bar, source/reference counters.
- Entity resolution that does **not** merge different people who merely share a name (§25); only
  strong identifiers (ABN/ACN/email/phone/username) merge records.
- Confidence engine (identity-match, not trustworthiness) with fully explained evidence lines,
  clamped 5–97%, documented weights.
- Results: summary, candidate cards, category sections (Identity / Business & ABN / Licences /
  Professional / Website / Web / Online / Public records), "Things to double-check", and a Sources
  table with authoritative-vs-discovery badges, links, and timestamps.
- Demo data is always badged "Demo data" and only present when `CHECKFIRST_DEMO_MODE=true`.

## Live providers (personally verified against real data)

| Provider | Verified behaviour |
|----------|--------------------|
| DNS & mail records (`dns`) | Live A/AAAA/MX/NS/SPF/DMARC for `example.com` — 4 result items returned. |
| SSL/TLS certificate (`tls`) | Live cert for `example.com` — subject/issuer/validity returned. SSRF-guarded. |
| Certificate Transparency (`ct`) | Live query to crt.sh; observed graceful `unavailable` on a crt.sh 502. |
| Domain registration RDAP (`rdap`) | Live query to rdap.org; observed graceful `unavailable` on timeout. |
| Discovery links (`searchlinks`, `courts`, `licences`, `professional`) | Generate valid one-click links to Google/AustLII/QBCC/NSW Fair Trading/Ahpra/ASIC. No scraping. |

## Providers requiring credentials (return `not_configured`, honestly)

| Provider | Env needed | Notes |
|----------|-----------|-------|
| ABN Lookup (`abn`) | `ABR_GUID` (free) | Real ABR web-services calls implemented; register at abr.business.gov.au/Tools/WebServices. |
| Web search (`websearch`) | `GOOGLE_CSE_API_KEY`+`GOOGLE_CSE_CX` or `BING_SEARCH_API_KEY` | Google CSE and Bing both implemented. |
| Email breach status (`hibp`) | `HIBP_API_KEY` | Status/date only; never passwords or dumps. |

## Not implemented (documented extension points)
- Live licence-register **APIs** (QBCC/NSW/VBA) — MVP provides official-portal discovery links, not
  live verification. Real connectors are the top P1 item.
- ASIC/ACCC dataset ingestion; professional-register APIs (Ahpra live) — discovery links only.
- Persistent database (no dossier DB by design, §21). Rate limiter is in-memory (single instance).
- PDF export, saved searches, accounts, timeline, relationship graph, reverse-image (all P1/P2).

## Demo functionality
`CHECKFIRST_DEMO_MODE` (default `true` in dev). Demo providers add a strong + weak person
candidate, an authoritative ABN record, and a QBCC licence — every item badged "Demo data".
**Set `CHECKFIRST_DEMO_MODE=false` in production.**

## Test results (2026-08-10)
- **Lint** (`next lint`): ✔ no warnings/errors.
- **Typecheck** (`tsc --noEmit`): ✔ clean.
- **Unit + integration** (`vitest`): ✔ **47 passed** / 9 files (phone, email, abn, url, name,
  confidence, resolve, ssrf, orchestrator).
- **Production build** (`next build`): ✔ compiles, 4/4 pages generated, `/` ≈ 113 kB First Load JS.
- **E2E** (`playwright`, desktop + mobile Chromium): ✔ **12 passed** — hero render, tab swap,
  optional expander, empty-form validation, full person search → live progress → report, website
  validation.
- **Adversarial/security**: ✔ empty→422, invalid type→400, bad JSON→400, 12k payload→413, bad
  ABN→422, bad email→422, unicode names→200, SQL-ish name→422 (rejected). SSRF: localhost/IP
  literals rejected at validation; private/loopback/link-local/metadata blocked by `isBlockedIp`
  (unit-tested); non-resolving domains degrade gracefully.

## Architecture
- **Next.js 15 App Router + React 19 + TS + Tailwind.** One codebase: SPA-feel UI + server route
  handlers keeping secrets server-side.
- `src/types/core.ts` — shared contracts. `src/lib/validation/*` — normalisation. `src/lib/query`
  — query generation. `src/lib/providers/*` — provider contract + registry + implementations +
  demo. `src/lib/orchestrator.ts` — streaming pipeline. `src/lib/confidence.ts`, `resolve.ts` —
  scoring + clustering. `src/lib/security/*` — SSRF + rate limit. `src/app/api/search/route.ts` —
  NDJSON stream. `src/components/search/*` — tabs, streaming hook, live progress, results.
- Streaming: NDJSON over POST (see `docs/ASSUMPTIONS.md` A4). Events: meta → provider… → candidates → report.

## Database / schema
None in MVP (§21 — no dossier DB). Temporary investigation state is per-request in memory.
Permanent/open-data caching is via per-provider `cacheExpiry`. A Postgres layer for licensed
ABR/licence bulk data is a documented P1 extension.

## Privacy / security controls
Server-side secrets; input sanitising + 8 KB body cap; per-field validation; output rendered as
text (no `dangerouslySetInnerHTML`); SSRF guard blocking localhost/loopback/private/link-local/
CGNAT/metadata (incl. DNS-rebinding via resolve-then-check); in-memory rate limiting (20/60s
default); security headers in `next.config.mjs`; no passwords/credentials/breach contents ever
surfaced.

## Known limitations / defects
- Rate limiter and any caching are process-local (won't hold across multiple instances).
- crt.sh and RDAP are third-party best-effort; they intermittently return 502/timeouts (handled as
  `unavailable`, by design).
- Licence/court/professional data is **discovery links**, not live verification (labelled as such).
- No automated a11y audit tool was run; a11y was built in (roles, labels, focus-visible,
  reduced-motion, live regions) but not externally scored.
- `next start` must be launched via `node node_modules/next/dist/bin/next start` in this
  environment; the bare `npm` shim was not on the sandbox PATH used by the preview spawner.

## Environment variables
See `.env.example`. All optional — the app runs with none. Keys: `CHECKFIRST_DEMO_MODE`,
`GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`, `BING_SEARCH_API_KEY`, `ABR_GUID`, `HIBP_API_KEY`,
`CHECKFIRST_RATE_LIMIT_MAX`, `CHECKFIRST_RATE_LIMIT_WINDOW_SECONDS`.

## How to run
```bash
npm install
npm run dev            # http://localhost:3000  (dev)
# — or production —
npm run build
npm run start          # http://localhost:3000

# quality gates
npm run lint
npm run typecheck
npm test               # unit + integration (vitest)
npm run build && npm run test:e2e   # Playwright (needs: npx playwright install chromium)
```
Node 24 LTS. On this machine Node lives at `C:\Program Files\nodejs`.

## Next 10 priorities (ranked)
1. Obtain `ABR_GUID` and validate the live ABN Lookup path against real ABNs (business search P0-real).
2. Add a Google CSE (or Bing) key and validate live web/social discovery results.
3. Build the first **live** licence connector (QBCC QLD) to replace discovery links with verification.
4. Persist rate-limit + open-data cache in a shared store (Redis) for multi-instance deploys.
5. Add a Postgres layer for licensed ABR business-name/ABN bulk data (fast, offline authoritative).
6. Cross-entity linking (person ↔ business ↔ licence) so related demo/real records form one candidate.
7. PDF report export (timestamped, source-linked).
8. Automated accessibility audit (axe) in CI + fix findings.
9. HIBP key + verify breach-status path; expand email discovery (Gravatar, public GitHub).
10. Harden `next start` launch + add a CI workflow running the full regression on every push.
