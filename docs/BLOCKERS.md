# Blockers & External Dependencies

Recorded per brief §0.3 ("record blockers, continue with independent work").

| # | Blocker | Impact | Workaround in MVP | Owner action to unblock |
|---|---------|--------|-------------------|-------------------------|
| B1 | GSD skill not installed | Cannot use mandated orchestrator | File-based `/docs` equivalent (A1) | Install GSD skill, then migrate |
| B2 | No ABR_GUID configured | ABN Lookup returns not_configured | Honest not_configured state; free to obtain | Register at abr.business.gov.au/Tools/WebServices |
| B3 | No Google CSE / Bing key | Web search returns not_configured | Generated search links still work | Add GOOGLE_CSE_API_KEY+CX or BING_SEARCH_API_KEY |
| B4 | No HIBP key | Breach-status returns not_configured | Honest not_configured state | Add HIBP_API_KEY |
| B5 | No free public API for most AU licence/court registers | Cannot live-verify licences | Discovery links to official portals, labelled non-authoritative | Build per-register connectors (P1) or licensed data feed |

None of these block a working, honest MVP: the app degrades gracefully and represents every
unavailable provider truthfully.
