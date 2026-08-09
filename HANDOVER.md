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
