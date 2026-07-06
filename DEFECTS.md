# DEFECTS — site-audit 2026-07-06T21:25:38.374Z

Base: http://localhost:3005 · routes: 32 · mode: desktop 1440x900 + mobile 390x844 · click-audit: on (safe mode — POSTs intercepted)

**✅ ZERO defects.**

| Severity | Route | Viewport | Element | Defect |
| --- | --- | --- | --- | --- |

<details><summary>6 third-party info notices (not defects — external SDK noise)</summary>

- /: pageerror: Error: An unexpected response was received from the server.
- /ask: pageerror: Error: An unexpected response was received from the server.
- /docs/quickstart: 3rd-party console error: Error checking Cross-Origin-Opener-Policy: Failed to fetch
- /app/spend: pageerror: Error: An unexpected response was received from the server.
- /app/discover: 3rd-party console error: Analytics SDK: TypeError: Failed to fetch
    at _t (<anonymous>:1:64025)
    at <anonymous>:1:68106 {context: AnalyticsSDKApiError}
- /app/settlements: pageerror: Error: An unexpected response was received from the server.
</details>

Screenshots: audit-artifacts/*.png