# test/browser/connection-startup-presentation.spec.ts
- Lines: 40 | Kind: test 1 UI over the dev connection dialog; test 2 module-in-page (pure function), chromium | Verdict: test 1 **MERGE** into `journeys/connection-cloud.spec.ts` (rewritten for the resident); test 2 **DELETE**
- Covers: (1) a saved development connection restores on reload without a chooser dialog appearing even briefly, and the settings stay reachable; (2) `agentAvailabilityNotice`/`agentPendingText` return '' while starting and an explanation otherwise. Duplicates: (2) is also exercised through UI by `connection-boundaries.production.spec.ts` ("automatic agent startup stays quiet", start failure copy). Callers/importers: none. 2 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-40 | T6 / T3 | Test 2 imports `connection-ui.tsx` and asserts four return values of two copy functions. | Delete. | none |
| 2 | 4-23 | P7 | Test 1 uses the dev profile connection ("Connect development profile") through the diagnostics backdoor. The product question it answers ("restart with a saved sign-in shows no chooser flash") applies to the resident. | Re-express: production harness, signed-in resident, reload, MutationObserver records no sign-in/chooser dialog. | Low. |
| 3 | 18 | P2 | Waits on `connectionController.getSnapshot().session`. | Wait on a visible signed-in state. | none |

## Proposed end state
One case in `journeys/connection-cloud.spec.ts`: "restart with a saved sign-in never flashes the sign-in or chooser". The pure-function test is gone.
