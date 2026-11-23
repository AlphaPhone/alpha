# test/native-browser-view-binding.test.mjs
- Lines: 53 | Kind: unit (real `ViewNavigationClient` and `subscribeNativeViewEvents` via `test/fixtures/browser-source.mjs`, all transports faked) | Verdict: DELETE; carry the review-required case into `journeys/browser.spec.ts`
- Covers: an agent browser command is claimed, executed and reported once; foreign sessions, inactive views, view changes and reconnects never repeat it; "Review phone actions first" refuses after claiming. Duplicates: Quint `specs/quint/refinement/application/committed-view-observation.mjs:69` runs the actual `ViewNavigationClient` with the installation registry and settlement through a closed request port. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-36 | T4 / T3 | Claim-once, foreign/inactive, view change after claim, reconnect without replay: exactly-once semantics the refinement observes. | Delete after confirming the refinement includes the reconnect/no-replay trace; otherwise add it there. | Medium |
| 2 | 37-53 | - | Review-gate refusal (`review-required:`) of an agent browser command. | One journey case: with "Review phone actions first" on, an agent Back command is refused and the page does not navigate. | Low |
| 3 | 5-6 | B4 / T7 | Replaces `globalThis.document` with an EventTarget for visibility. | Gone. | None |

## Proposed end state
File deleted; exactly-once lives in the refinement, the review gate in the browser journey.
