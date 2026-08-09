# Check First — Roadmap & Requirements Traceability

Loop for every unit: **PLAN → IMPLEMENT → RUN → TEST → INSPECT → FIX → RETEST → VERIFY → COMPLETE.**
Status legend: ☐ not started · ◐ in progress · ☑ done & verified · ⚠ blocked (see BLOCKERS)

| Phase | Scope (brief refs) | Status |
|------:|--------------------|:------:|
| 1 | Repo audit, foundation, architecture (§0,§46) | ☑ |
| 2 | Consumer landing + interactive hero search (§3–5) | ☑ |
| 3 | Input validation & normalisation (§7–11, §37) | ☑ |
| 4 | Provider architecture + search orchestrator (§22–23) | ☑ |
| 5 | Initial real AU public-data integrations (§12–15) | ☑ |
| 6 | Public web/search discovery (§18–20) | ☑ |
| 7 | Entity resolution + confidence engine (§25–26) | ☑ |
| 8 | Real-time search/loading experience (§24) | ☑ |
| 9 | Results/report experience + provenance (§27–28,§31) | ☑ |
| 10 | Privacy, security & abuse controls (§29–30) | ☑ |
| 11 | Responsive / accessibility polish (§35) | ☑ |
| 12 | Full QA, browser testing, regression, handover (§38–44) | ☑ |

**Regression (2026-08-10):** lint ✔ · typecheck ✔ · 47 unit+integration ✔ · prod build ✔ ·
12 Playwright E2E ✔ (desktop + mobile) · adversarial + SSRF ✔. See HANDOVER.md.

## Phase acceptance criteria (condensed from brief)

**P2/3** — Landing renders desktop (left marketing / right search card) + mobile stacked.
Five tabs (Person/Business/Phone/Email/Website) each swap form + validation. Person optional
details expander. Client + server validation. Normalisation libs unit-tested.

**P4** — `Provider` interface returns {provider, category, status, query, timestamp, results,
sourceUrl, sourceAuthority, confidence/evidence, warnings, cacheExpiry, authoritative/discovery}.
Orchestrator: validate→normalise→generate queries→select providers→concurrent exec with
timeout/backoff/concurrency caps→stream states→collect→correlate→confidence→report. One
provider failing never kills the search.

**P5** — Real integrations: ABN Lookup (ABR), DNS/MX/SPF/DMARC, SSL/TLS + Certificate
Transparency (crt.sh). Config-gated: Google/Bing web search, HIBP breach-status. Missing
creds → `not_configured`, shown honestly.

**P6** — Query-generation service builds targeted, useful search variants (name+location,
site: dorks, quoted phone/email, ABN) — legitimate APIs only.

**P7** — Candidate clustering (no assuming same name = same person); confidence engine with
explicit positive/negative evidence signals and documented scoring; evidence always exposed.

**P8** — Live provider-state loading experience wired to real backend states (no fake timer);
source/result counters.

**P9** — Single-page results: summary + sections (Identity, Business & ABN, Licences,
Contact, Online presence, Public records, Websites, Things to double-check, Sources). Every
claim carries provenance (source, timestamp, authoritative/discovery, link).

**P10** — SSRF guards (block localhost/loopback/private/link-local/metadata), rate limiting,
input caps, output encoding, retention/deletion, secrets server-side only.

**P11** — Keyboard nav, visible focus, ARIA, skeletons, transitions, empty/error states.

**P12** — lint + typecheck + unit + integration + E2E + prod build + browser QA (desktop &
mobile, all 5 modes, invalid/valid/zero-result/failure/timeout/missing-creds/demo) → HANDOVER.md.

## Priority guard (§40)
Do not build P1/P2 backlog items while any P0 item is materially broken.
