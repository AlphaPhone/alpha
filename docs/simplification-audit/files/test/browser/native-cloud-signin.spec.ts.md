# test/browser/native-cloud-signin.spec.ts
- Lines: 367 | Kind: Playwright journeys on an isolated production composition (own Vite dev server per file via `helpers/native-cloud-signin.ts`), native ports synthetic; project `chromium`, 19 tests | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (sign-in block), trimmed
- Covers: in-app Eliza Cloud sign-in: email and phone codes with wrong-code retry and resend cooldown, Google through the native host (late readiness, cancel, reopen, new-account notice), MFA, offline, tenant method discovery, no provider documents, readiness hold screen and reduced motion, plan ending during readiness, button system and spacing. No browser hand-off happens at any point. Duplicates: `accessibility-sign-in.production.spec.ts`, `signed-out-page.production.spec.ts` (sign-in page); wrong-code retry is checked three times here (lines 54-58, 257-261, 347-348). Callers/importers: none; imports `flag-off-android.ts`, `helpers/native-cloud-signin.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | P3 / C5 | `startNativeCloudSignInFixture` starts a second Vite dev server for this file; `native-cloud-subscription.spec.ts` starts a third with an almost identical inline `createServer` + virtual entry. | One composition server fixture (worker-scoped) shared by both specs, or run the composition from the normal dev server behind a route. | Low; saves a cold Vite graph per file (the subscription spec allows 90 s for it) |
| 2 | 33-67, 248-271, 335-352 | T4 | Wrong-code retry, code field kept, nothing saved: asserted for email, phone and again in the button-system walk. | Keep one wrong-code check (email) and one phone happy path with MFA. | none |
| 3 | 12, 140, 144 | T6 | Reads `planController.getSnapshot()` and calls `openPlan`/`recheckPlanAfterRefusal` directly. | Snapshot reads as observables are acceptable if wrapped by one fixture accessor; replace `openPlan` with the Settings/notice UI path. | Low |
| 4 | 246 | style | `beforeEach` placed between tests applies to the whole file. | Put it in the fixture. | none |
| 5 | 323-334 | — | `expectButtonSystem` is a layout heuristic (equal heights, radii, spacing). | Move to the a11y/layout harness; run it once per sign-in step in one test. | none |
| 6 | 45, 60, 195, 226, 336, 354 | B5 | Many screenshots nothing compares. | Keep for review artefacts only on failure (trace). | none |

## Proposed end state
About 12 tests in the sign-in block of `journeys/connection-cloud.spec.ts`: email code (wrong code, resend cooldown),
phone code with MFA, Google return plus new-account notice, Google cancel/reopen, readiness hold and timeout, tenant
method discovery, offline, plan ending during readiness, and one button-system walk. They run on one shared composition server with
the sign-in native fake.
