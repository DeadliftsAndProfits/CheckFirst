# Build Status (living document)

## Current state — MVP complete & verified (2026-08-10)
All 12 roadmap phases done and verified. See `../HANDOVER.md` for the full accounting.

Regression: lint ✔ · typecheck ✔ · 47 unit+integration ✔ · prod build ✔ · 12 E2E ✔
(desktop+mobile) · adversarial + SSRF ✔.

## What runs
- 5 search modes end-to-end via streaming `POST /api/search` (NDJSON).
- Real zero-cred providers: DNS, TLS, Certificate Transparency, RDAP, discovery links.
- Credential-gated (honest not_configured): ABN Lookup (ABR), Google/Bing web search, HIBP.
- Entity resolution + confidence engine + full report with provenance.
- Demo fixtures (badged "Demo data") when CHECKFIRST_DEMO_MODE=true.

## How to run
```
npm install
npm run dev                          # http://localhost:3000
npm run typecheck && npm test        # gates
npm run build && npm run start       # production (use node bin if npm shim missing — see HANDOVER)
npm run test:e2e                     # Playwright (npx playwright install chromium first)
```

## Next
See HANDOVER.md "Next 10 priorities". Top items: real ABR_GUID, web-search key, live QBCC connector.
