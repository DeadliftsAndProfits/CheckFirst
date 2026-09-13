# WEB_QUERY_AUDIT.md

Audit of Check First's **existing** web sub-query generation, as it stands before
the multi-provider router milestone. This documents current behaviour only — it
does **not** propose a redesign (per milestone §1–§2). All examples use safe,
synthetic inputs.

Source of truth:
- `src/lib/query/generator.ts` → `generateQueries()` (the web-search query strings)
- `src/lib/providers/websearch.ts` → how many of those queries are actually executed
- `src/lib/validation/phone.ts` → `phoneVariants()`
- `src/lib/orchestrator.ts` → how providers are scheduled

---

## TL;DR — the two numbers that matter

- **`generateQueries()` produces up to 12 query strings** (`.slice(0, 12)`).
- **`websearch` only executes the FIRST 4 of them** (`ctx.queries.slice(0, 4)` in
  `websearch.ts:93`).

So the **arbitrary "4" the milestone wants removed is real, and it lives in the
web-search provider** — not the generator. Today, a rich search silently discards
generated queries 5–12. This is the single most important finding.

There is **no iterative/adaptive querying** anywhere: queries are planned once,
before any provider runs, and never regenerated based on results. The pipeline is
already "plan once → search → correlate", which matches the milestone's intent.

---

## The 18 required points

1. **Fields that can generate web queries**
   - Person: `fullName`, `employer`/`businessName`/`occupation` (as "context"), `suburb`, `state`, `emails`, `phones`
   - Business: `businessName`, `abn`, `website`, `suburb`, `state`, `emails`, `phones`
   - Phone: `phones`
   - Email: `emails` (+ the local-part "handle")
   - Website: `domain`
   - **Fields that generate NO web query:** `middleName`, `ageBand`/`ageRange`, `address`, `postcode`, `acn`, and **`username`** (username is used only for discovery *links*, never a web-API query).

2. **Which field combinations generate queries** (person)
   - `name + context` → 3 queries (unquoted, quoted, `+ linkedin`)
   - `name + location` → 1 query
   - `name` alone → 2 queries (`site:linkedin.com`, bare quoted name)
   - each email → 1, each phone → 1 per canonical variant

3. **Exact query templates**
   - Person: `${name} ${context}`, `"${name}" ${context}`, `${name} ${context} linkedin`, `"${name}" ${suburb} ${state}`, `"${name}" site:linkedin.com`, `"${name}"`, `"${email}"`, `"${phoneVariant}"`
   - Business: `"${bn}"`, `"${bn}" ABN`, `"${bn}" ${loc}`, `"${bn}" reviews`, `"${abn}" ABN`, `"${website}"`, `"${email}"`, `"${phoneVariant}"`
   - Phone: `"${phoneVariant}"` (per variant)
   - Email: `"${email}"`, `"${handle}"` (handle only if length > 2)
   - Website: `"${domain}"`, `"${domain}" ABN`, `"${domain}" reviews`

4. **Maximum web sub-queries:** generator caps at **12**; provider caps execution at **4**. So today **max 4 actual web API calls**, regardless of how much the user enters.

5. **Minimum:** **0** (e.g. a phone that fails to parse → `phoneVariants()` returns `[]`; validation normally guarantees ≥1 meaningful field, so 1 in practice).

6. **Conditional generation:** yes — every query is guarded by the presence of its field (`if (name)`, `if (context)`, `if (loc)`, per-email, per-phone).

7. **Sequential vs concurrent:**
   - **Providers** run concurrently (orchestrator pool, `CONCURRENCY = 6`).
   - **Web sub-queries within `websearch`** run **sequentially** (a `for` loop; Brave calls are additionally spaced 1100 ms to respect its ~1 req/sec free limit).

8. **Does query generation change after seeing results?** **No.** `generateQueries()` runs once in the orchestrator before any provider executes. No feedback loop.

9. **Do phone variants generate separate API calls?** **Yes.** Each canonical variant is a separate quoted query. `0412 345 678` → `"0412345678"`, `"0412 345 678"`, `"+61412345678"` = **3 queries** for one number (subject to the provider's 4-cap).

10. **Does email generate a separate API call?** **Yes.** `"${email}"` is its own query; in Email-type searches the local-part handle adds one more.

11. **Do usernames generate searches?** **No web-API query.** `username` appears only in `generateDiscoveryLinks()` (one-click public-search links), never in `generateQueries()`.

12. **Is employer/business combined with the name?** **Yes.** `context = employer || businessName || occupation`, combined into 3 name+context queries.

13. **Is location combined with the name?** **Yes.** `"${name}" ${suburb} ${state}`.

14. **Site-specific queries?** **Yes** — `"${name}" site:linkedin.com` is a real web-API query. (Discovery-link providers also use `site:` operators, but those are links, not API calls.)

15. **Can duplicate/equivalent queries occur?** Exact duplicates are removed by a `Set`. **Near-equivalents still run** (e.g. `Sam Magee Acme` vs `"Sam Magee" Acme`; and the three phone variants of one number are distinct strings).

16. **Do structured lookups accidentally consume web-search calls?** **No.** Only the `websearch` provider calls a general web-search API. Discovery-link providers (`searchlinks`, `courts`, `licences`, `professional`) only *build URLs* (zero API cost) — and `searchlinks` even suppresses itself when a web engine is configured. Structured providers (`abn`, `dns`, `rdap`, `tls`, `ct`, `gravatar`, `hibp`, `xposedornot`, `leakcheck`, `webcontent`) hit their own dedicated endpoints. Clean separation, consistent with §20.

17. **Hard-coded query limits:**
    - `generator.ts` → `.slice(0, 12)` (generation cap)
    - `websearch.ts:93` → `ctx.queries.slice(0, 4)` (**execution cap — the arbitrary "4"**)
    - `websearch.ts` → `count = 8` per request, `results.slice(0, 18)` total

18. **Result-quality / iterative-search logic:** **None.** No re-querying, no quality evaluation loop, no LLM-in-the-loop. Already compliant with §17.

---

## Worked examples (synthetic inputs)

### Rich person — all fields
```
INPUT: First "Alex", Last "Taylor", Suburb "Brisbane", State "QLD",
       Employer "Acme Finance", Phone "0412 345 678", Email "alex@example.com"

GENERATED WEB QUERIES (10):
 1. Alex Taylor Acme Finance
 2. "Alex Taylor" Acme Finance
 3. Alex Taylor Acme Finance linkedin
 4. "Alex Taylor" Brisbane QLD
 5. "Alex Taylor" site:linkedin.com
 6. "Alex Taylor"
 7. "alex@example.com"
 8. "0412345678"
 9. "0412 345 678"
10. "+61412345678"

EXECUTED TODAY: only #1–#4  (websearch 4-cap)  → 6 generated queries dropped
OTHER PROVIDERS: xposedornot, leakcheck, hibp(not_configured), dns?, searchlinks(suppressed), licences, professional, courts, abn(n/a)
```

### Name + employer + state
```
INPUT: First "Alex", Last "Taylor", Employer "Acme Finance", State "QLD"
QUERIES (6): "Alex Taylor Acme Finance", '"Alex Taylor" Acme Finance',
 "Alex Taylor Acme Finance linkedin", '"Alex Taylor" QLD',
 '"Alex Taylor" site:linkedin.com', '"Alex Taylor"'
EXECUTED TODAY: #1–#4
```

### Name + state
```
INPUT: First "Alex", Last "Taylor", State "QLD"
QUERIES (3): '"Alex Taylor" QLD', '"Alex Taylor" site:linkedin.com', '"Alex Taylor"'
EXECUTED TODAY: all 3
```

### ABN-only (business)
```
INPUT: ABN "12 345 678 901"
QUERIES (1): '"12345678901" ABN'
EXECUTED TODAY: 1   (+ ABR structured lookup runs independently)
→ Already matches the milestone's "zero or one web query for ABN" philosophy.
```

### Phone-only
```
INPUT: Phone "0412 345 678"
QUERIES (3): '"0412345678"', '"0412 345 678"', '"+61412345678"'
EXECUTED TODAY: all 3
→ One number currently = 3 web queries (one per canonical variant).
```

### Email-only
```
INPUT: Email "alex@example.com"
QUERIES (2): '"alex@example.com"', '"alex"'
EXECUTED TODAY: both   (+ breach providers run independently)
```

### Business
```
INPUT: Business "Acme Finance Pty Ltd", State "QLD", ABN "12345678901", Website "acmefinance.com.au"
QUERIES (6): '"Acme Finance Pty Ltd"', '"Acme Finance Pty Ltd" ABN',
 '"Acme Finance Pty Ltd" QLD', '"Acme Finance Pty Ltd" reviews',
 '"12345678901" ABN', '"acmefinance.com.au"'
EXECUTED TODAY: #1–#4
```

### Website
```
INPUT: Website "acmefinance.com.au"
QUERIES (3): '"acmefinance.com.au"', '"acmefinance.com.au" ABN', '"acmefinance.com.au" reviews'
EXECUTED TODAY: all 3
```

---

## Observations for the (separate) query-strategy discussion

Not acted on in this milestone — recorded for §41/§56 review:

- The **4-cap in `websearch.ts` is the real limiter**, and it silently drops
  generated queries. The milestone (§3) asks to remove it; execution should be
  bounded by the configurable safety ceiling instead, with logging.
- **Phone-only = 3 queries** and **rich person = 10 queries**: query-heavy versus
  the milestone's future "one query per distinct signal" philosophy. Candidates
  for consolidation later (e.g. OR-ing phone variants), but **not changed now**.
- Near-equivalent quoted/unquoted pairs both execute — another future
  consolidation candidate.
- `username`, `middleName`, `ageBand`, `address`, `postcode`, `acn` contribute
  **no** web query today.
