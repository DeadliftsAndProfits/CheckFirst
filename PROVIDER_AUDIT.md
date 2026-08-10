# Provider Audit — Round 3

_Audited 2026-08-10 by running the actual orchestrator against the running server (demo OFF)
and by testing each external endpoint directly with `curl`._

## Headline findings

1. **The default build ships with `CHECKFIRST_DEMO_MODE` defaulting to `true`.** That means a
   normal user search silently included demo fixture candidates (badged "Demo data", but present
   in the default flow). **Fixed in R3:** demo now defaults **OFF**; fixtures run only when
   `CHECKFIRST_DEMO_MODE=true` is explicitly set.
2. **Website search is genuinely LIVE** — a real search takes ~9s of real network work
   (DNS/TLS/RDAP), which is why it *feels* real. Person/Business/Phone completed in **~6ms**
   because, without API keys, **no real external query happens** for them — every "complete" came
   from *link-generator* providers that build official-register URLs, not searches.
3. **Link-generators were being counted as "sources that returned results."** That overstated
   activity. **Fixed in R3:** they are reclassified as `dataOrigin: "link"`, shown in a separate
   "Official sources to check" section, and excluded from the "sources searched / references"
   counts.

## Evidence — per search type, demo OFF (real timing from the live server)

```
PERSON  (6ms)   licences complete(2*) · professional complete(3*) · searchlinks complete(10*)
                · courts complete(2*) · websearch not_configured        (* = generated links, not searches)
WEBSITE (9030ms) dns complete(4) · tls complete(1) · rdap complete(1) · ct unavailable
                · websearch not_configured · searchlinks complete(1*)
EMAIL   (7ms)   dns complete(4) · searchlinks complete(1*) · hibp not_configured · websearch not_configured
BUSINESS(6ms)   abn not_configured · licences(1*) · professional(3*) · searchlinks(10*) · courts(2*) · websearch not_configured
PHONE   (6ms)   websearch not_configured · searchlinks complete(1*)
```

## Endpoint reachability tests (curl)

| Endpoint | Test | Result |
|----------|------|--------|
| ABR `AbnDetails.aspx` | empty GUID | HTTP 200, JSON `Message: "The GUID entered is not recognised as a Registered Party"` — **works, needs free GUID** |
| RDAP `rdap.org/domain/example.com` | GET | HTTP 302 → registry (follows to data) — **LIVE** |
| crt.sh JSON | GET | HTTP 404/502 intermittently — **LIVE but unreliable** (handled as `unavailable`) |
| Gravatar avatar `?d=404` | real address | HTTP 200 (profile exists) — **LIVE, zero-cred** → implemented in R3 |
| Gravatar `profile.json` | real address | HTTP 200 — **LIVE** |
| Website homepage fetch | `telstra.com.au` | got `<title>` — **feasible** → website-content provider added in R3 |

## Provider classification table

Legend: **LIVE** = real network query executed · **LINK** = generates official-source links (no
query) · **REQUIRES CONFIG** = real implementation, needs an API key · **UNAVAILABLE** = real
attempt, third-party failed · **DEMO** = fixture (explicit demo mode only).

| Provider | Category | Implementation | Class | Auth | Endpoint / source | Tested | Result | Work still required |
|----------|----------|----------------|-------|------|-------------------|--------|--------|---------------------|
| `dns` | website/email | Node `dns.Resolver` | **LIVE** | none | system resolver | ✅ example.com | 4 records | — |
| `tls` | website | Node `tls.connect` :443 | **LIVE** | none | direct TLS, SSRF-guarded | ✅ example.com | cert returned | — |
| `rdap` | website | `fetch` rdap.org | **LIVE** | none | rdap.org bootstrap | ✅ 302→data | reg dates | — |
| `ct` | website | `fetch` crt.sh JSON | **LIVE (flaky)** | none | crt.sh | ✅ | intermittent 404/502 | consider a CT mirror |
| `gravatar` (R3) | email | md5 → avatar + profile.json | **LIVE** | none | gravatar.com | ✅ 200 | profile/none | — |
| `webcontent` (R3) | website/business | SSRF-guarded homepage fetch, title/meta + ABN/ACN scan | **LIVE** | none | target site | ✅ telstra | title parsed | render-heavy sites won't expose SPA content |
| `abn` | business | ABR web services JSON | **REQUIRES CONFIG** | ABR GUID (free) | abr.business.gov.au | ✅ (empty GUID rejected) | needs GUID | obtain free GUID |
| `websearch` | web | Google CSE / Bing | **REQUIRES CONFIG** | API key | googleapis / bing | ✅ (no key → not_configured) | needs key | add GOOGLE_CSE_* or BING key |
| `hibp` | email | HIBP v3 | **REQUIRES CONFIG** | API key | haveibeenpwned.com | n/a | needs key | add HIBP_API_KEY |
| `searchlinks` | online | builds Google `site:` search URLs | **LINK** | none | — | ✅ | links only | not a search; official discovery links |
| `courts` | public_records | AustLII/court search URLs | **LINK** | none | — | ✅ | links only | live AustLII API is a future connector |
| `licences` | licences | QBCC/NSW portal URLs | **LINK** | none | — | ✅ | links only | live per-register connectors (future) |
| `professional` | professional | Ahpra/ASIC/ACCC search URLs | **LINK** | none | — | ✅ | links only | live register connectors (future) |
| `demo-*` | identity/business/licences | static fixtures | **DEMO** | none | in-code | ✅ | fixtures | explicit demo mode only (now default OFF) |

## Actions taken in Round 3
- Demo default **OFF**; production/default search never uses fixtures.
- Added `dataOrigin` to every provider result; UI badges LIVE / LINK / REQUIRES CONFIG / DEMO / etc.
- Reclassified the four link-generators; excluded from "searched / returned results" counts and
  shown in a dedicated "Official sources to check" section.
- Added two genuine zero-credential LIVE providers: **Gravatar** (email) and **website content**
  (homepage title/meta + displayed ABN/ACN, cross-checked with ABR when configured).
- Honest final summary: sources searched / returned results / no results / unavailable / needs
  configuration / official links.

## Still not real without configuration or further engineering
- **Business identity (ABN/ACN, GST, entity):** needs a free `ABR_GUID`. One env var away from LIVE.
- **Public web / phone / social discovery:** needs a web-search API key (`GOOGLE_CSE_*` or `BING`).
  Until then, only official discovery **links** are provided (honestly labelled).
- **Email breach status:** needs `HIBP_API_KEY`.
- **Live licence / court / professional register lookups:** no free automatable API; discovery
  links only. Future per-register connectors or licensed data feeds required.
