# Assumptions & Decisions Log

Recorded per brief §0.2 ("choose the safest reasonable MVP default, record the assumption
and continue"). Each entry: decision, rationale, reversibility.

- **A1 — GSD not installed → file-based equivalent.** GSD is absent from this machine
  (no skill/plugin/command) and from the available-skills list. We will not fabricate GSD
  commands. We run the identical PLAN→…→VERIFY loop using `/docs` for planning, phase
  tracking, and context persistence. Reversible: if GSD is later installed, adopt it and
  migrate these docs. Blocking? No.

- **A2 — Node.js was not installed.** Installed Node LTS 24.19.0 via winget (pre-authorised
  in settings.local.json `Bash(winget install *)`). Reversible: yes.

- **A3 — Stack: Next.js 15 + React 19 + TS + Tailwind.** Chosen so one codebase serves the
  SPA UI and the server-side provider fan-out with secrets kept server-side. Alternative
  (separate SPA + API) rejected as heavier for an MVP. Reversible: high cost.

- **A4 — Streaming via NDJSON over a POST route.** The live search experience needs
  incremental provider states. Server-Sent Events require GET; our search payload is a POST
  body, so we stream newline-delimited JSON from the POST response. Reversible: yes.

- **A5 — No user database in MVP.** Per §21 we avoid a permanent dossier DB. Temporary
  investigation state lives in-memory per request; permanent/open-data caching is file/memory
  backed with TTL. A real DB (Postgres) is a documented P1 extension point. Reversible: yes.

- **A6 — Demo fixtures default ON in dev, OFF in prod.** `CHECKFIRST_DEMO_MODE`. Fixtures are
  always visibly labelled "Demo data" and never silently substitute for real provider output.

- **A7 — Which providers are "real" now.** Zero-credential real providers implemented first:
  DNS/MX/SPF/DMARC (Node `dns`), SSL/TLS cert (Node `tls`), Certificate Transparency (crt.sh),
  ABN Lookup (ABR — works with a free GUID; without it returns not_configured). Credential-
  gated: Google/Bing web search, HIBP. Live-scrape-restricted sources (social, white pages)
  are surfaced as *generated search links*, never scraped behind auth.

- **A8 — Court/tribunal & licence registers.** No universal free API. MVP provides an
  extensible connector architecture + generated discovery links to official portals
  (austlii, QBCC, NSW Fair Trading, Ahpra), labelled "discovery" not "authoritative". Real
  API connectors are documented extension points. This keeps us lawful and honest.
