# test/browser/mock-background-admission.spec.ts
- Lines: 68 | Kind: Playwright integration of dev mock-mode entry on a stubbed Android bridge; project `chromium`, 6 tests (cold/chooser x none/hosted/notifications) | Verdict: **MERGE** into `journeys/dev-surface.spec.ts` (3 cases)
- Covers: entering mock mode (cold start or from the diagnostics chooser) first pauses live notification collection and hosted background results; mock UI stays hidden until both pauses resolve; a rejected pause shows an error and keeps live mode (cold start offers Retry). Duplicates: none. Callers/importers: none; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T7 | 2x3 matrix; "hosted" vs "notifications" failure exercise the same error path. | Keep: cold/none, cold/notifications-failure + retry, chooser/none. | Low |
| 2 | 16, 27-31 | A3 / C4 | `AlphaHostedResults.disableBackground` is part of the hosted-results path (`runtime/hosted-background.ts`, `native/alpha-hosted-results.ts`). If C4 deletes hosted background results, the "hosted" barrier and its failure case go. | Drop the hosted barrier in the same change as C4. | Low |
| 3 | 12-34 | T7 | Inline Capacitor fake. | Shared bridge harness. | none |
| 4 | 30, 53 | — | Uses `sessionStorage` as a cross-reload switch to release barriers. | Keep; it is a clear fixture control. | none |

## Proposed end state
Three tests in the mock-entry block of `journeys/dev-surface.spec.ts` (the dev-only journey spec, run only with
`ELIZA_DEV_ALLOW_TEST_MOCKS=1`), on the shared Android bridge. The hosted barrier follows the C4 decision.
