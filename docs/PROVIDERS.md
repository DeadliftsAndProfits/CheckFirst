# Provider Status Register

Classification: **authoritative** (official register / issuer) vs **discovery** (search/index
pointer). Status one of: implemented-real · config-gated · discovery-links · planned.

| Provider | Category | Class | Credentials | Status |
|----------|----------|-------|-------------|--------|
| DNS records (A/AAAA/MX/TXT/SPF/DMARC/NS) | website | authoritative(technical) | none | implemented-real |
| SSL/TLS certificate | website | authoritative(technical) | none | implemented-real |
| Certificate Transparency (crt.sh) | website | discovery | none | implemented-real |
| Domain/WHOIS age (RDAP) | website | authoritative | none | implemented-real |
| ABN Lookup (ABR web services) | business | authoritative | ABR_GUID (free) | config-gated → real |
| Google/Bing web search | web discovery | discovery | GOOGLE_CSE_* / BING_* | config-gated |
| HIBP breach-status | email | authoritative(status only) | HIBP_API_KEY | config-gated |
| Generated search links (social/directory/dork) | web discovery | discovery | none | implemented-real |
| Court/tribunal (AustLII discovery) | public records | discovery | none | discovery-links |
| Trade licences (QBCC/NSW) | licences | authoritative | — | discovery-links + planned connector |
| Professional (Ahpra etc.) | professional | authoritative | — | discovery-links + planned connector |
| ASIC / ACCC registers | regulatory | authoritative | — | planned connector |

Notes:
- "config-gated" providers return `not_configured` (shown honestly) until keys are supplied.
- "discovery-links" providers never scrape; they generate legitimate links to official
  search portals so the consumer can open the authoritative source in one click.
- Bulk ABR/licence ingestion into our own DB is a documented P1/P2 extension (§12, §21).
