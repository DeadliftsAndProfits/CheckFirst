# Check First

> **Know before you trust.** Check people and businesses using publicly available information.

Check First is an Australian-first consumer verification platform. Enter what you know about a
person or business, and Check First searches public sources — business registers, licences, DNS
and certificates, public web and records — to help you see whether what you've been told matches
independent public information, before you date, hire, pay, meet, or trust.

It presents **evidence and provenance**, plus how confident it is that records refer to the same
entity. It never labels anyone "safe" or "trustworthy", and it is **not** a criminal-history check.

## Quick start
```bash
npm install
npm run dev     # http://localhost:3000
```
The app runs with **no** API keys — providers without credentials report `not_configured`
honestly. Add keys from `.env.example` to light up ABN Lookup, web search, and breach status.

## Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit + integration (Vitest) |
| `npm run test:e2e` | Playwright E2E (run `npx playwright install chromium` first) |

## Documentation
- **`HANDOVER.md`** — full, brutally-accurate status, what works, what needs credentials, test results.
- **`docs/`** — project charter, roadmap & requirements traceability, assumptions, provider register, blockers.

## Tech
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Vitest · Playwright.
Secrets stay server-side; website checks are SSRF-guarded; requests are rate-limited.
