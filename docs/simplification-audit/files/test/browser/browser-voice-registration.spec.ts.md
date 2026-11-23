# test/browser/browser-voice-registration.spec.ts
- Lines: 14 | Kind: Playwright, chromium, 3 tests; module-in-page (s7 r3) | Verdict: DELETE (test 1's device-controls check folds into the single `dev-surface.smoke.spec.ts`)
- Covers: (1) in dev mode the launcher bridge, System, DailyApps and AlphaHostedResults stand-ins answer and Device controls opens; (2-3) `BrowserVoice` cancellation before a deferred developer-agent dependency resolves starts no host speech. Duplicates: Device controls opening is exercised by ~41 dev specs; plugin registration is implied by every journey that renders Home. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T6 / P7 | Calls `launcherBridge.list()`, `System.getStatus()`, `DailyApps.listReminders()`, `registerPlugin('AlphaHostedResults').status()` and asserts counts/types: tests that stand-ins exist. `AlphaHostedResults` registration is marked for merge/removal (D5, `register-hosted-results.ts` report). | Delete; Device controls assertion moves to the dev smoke spec. | None |
| 2 | 9, 13 | T6 / P3 | Overwrites `connectionController.getBrowserSpeechAgent` (developer resident route) and calls `new BrowserVoice()` cancel paths. | Delete with the developer browser-speech route; not a product path. | Low |

## Proposed end state
File deleted. `dev-surface.smoke.spec.ts` asserts Device controls opens in `?mode=dev`.
