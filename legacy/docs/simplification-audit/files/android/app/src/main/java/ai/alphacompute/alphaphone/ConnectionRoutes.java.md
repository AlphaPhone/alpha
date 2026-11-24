# android/app/src/main/java/ai/alphacompute/alphaphone/ConnectionRoutes.java
- Lines: 44 | Role: Alpha's renderer-transport route policy: the shared CloudConnectionPolicy bound to CloudDeployment hosts plus the cli-session refusal and device-capability syntax check. | Verdict: SIMPLIFY
- Importers: `AlphaConnectionPlugin` (263-359; also uses `ConnectionRoutes.POLICY` directly at 284). Text/path pins: `scripts/android-instrumentation.ts`; `specs/quint/refinement/native/credential-coordinator.mjs`; `test/connection-routes.test.mjs` + `test/fixtures/ConnectionRoutesTest.java`, `test/calendar-sync-consent.test.mjs`, `test/cloud-deployment.test.mjs`, `test/cloud-sign-in-flow.test.mjs`, `test/login-surfaces.test.mjs`, `test/android-instrumentation-runner.test.mjs`; androidTest `ConnectionRoutesInstrumentedTest`; mentioned in `apps/app/src/runtime/development-cloud-agents.ts:17`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26 | A7 | `calendarSync(...)` forward has no caller (grep `ConnectionRoutes.calendarSync`: 0 hits). | Delete. | none |
| 2 | 18-19, 27-30, 43 | D4 | Seven one-line pass-throughs to `POLICY.*` / static `CloudConnectionPolicy.*`; the caller already uses `ConnectionRoutes.POLICY` directly once. | Have `AlphaConnectionPlugin` call `ConnectionRoutes.POLICY.x(...)` (and the static `CloudConnectionPolicy.admittedHeader/mapsRequestIdentity`) directly; keep only `POLICY`, `managedService` (Alpha rule) and `deviceCapabilities` here. | low (host tests that call the forwards need edits) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| POLICY | const | 15-17 | - | stay |
| cloudSignInHandOff | helper | 24 | - | stay (private) |
| deviceCapabilities | helper | 36-42 | - | stay |

## Proposed end state
POLICY + managedService + deviceCapabilities; ~25 lines. Estimated lines after: 25.

## Verification
`test/connection-routes.test.mjs`, androidTest ConnectionRoutes.
