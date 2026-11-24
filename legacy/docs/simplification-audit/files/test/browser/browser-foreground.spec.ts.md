# test/browser/browser-foreground.spec.ts
- Lines: 11 | Kind: Playwright spec, chromium dev (`?mode=dev&tools=1`), 1 test; Device-controls simulator plus `/src` imports | Verdict: DELETE
- Covers: when the simulated phone is powered off/locked, workflow notices are listed without text and open/dismiss are refused until unlock. Duplicates: lock-screen notice privacy in notification specs (other chunks). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 8, 10 | T6/P2 | Publishes and reads notices through `browser/workflow-notices.ts` and `registerPlugin('AlphaNotifications')`. | Delete. | Low. |
| 2 | 5, 10 | P7 | Power/Wake/fingerprint are the dev "Device controls" simulator; on Android the lock screen is the OS. | Delete. | Low. |
| 3 | 7 | T5 | Injects a hidden decoy button to test the test's own locator. | Delete. | None. |

## Proposed end state
File deleted. If lock-state privacy of workflow notices is a renderer rule, it belongs in `journeys/notifications.spec.ts` driven by the native notification stub's lock-state event, not the simulator.
