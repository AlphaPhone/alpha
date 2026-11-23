# test/fixtures/ConnectionRoutesTest.java
- Lines: 156 | Kind: Java fixture, integration of `CloudDeployment`, upstream `CloudConnectionPolicy` and the `ConnectionRoutes` facade | Verdict: KEEP, MOVE to the Gradle JVM connection-cloud suite (retarget at `ConnectionRoutes.POLICY` after U-A6)
- Covers: the native renderer transport allow-list: flag-off builds talk only to `https://api.eliza.app` on the default port, refuse remote/paired agent origins and lookalike hosts, admit only reviewed managed-service routes (Calendar, Gmail, Maps, subscription, billing), exact Cloud key self-revocation, openExternal hosts, device capability syntax. Duplicates: androidTest `ConnectionRoutesInstrumentedTest` (on device, fewer cases); `test/login-surfaces.test.mjs`, `cloud-sign-in-flow`, `cloud-deployment` touch parts. Callers/importers: `test/connection-routes.test.mjs:11`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-14 | A3 / D5 | `retiredPairing` cases: production refuses `/api/auth/pair`, test-mocks builds "keep development pairing". When D5 removes the development pairing harness the flag-on half goes. | Keep the flag-off refusal; delete the flag-on case together with the harness. | Low |
| 2 | 15, 130 | A8 | Comments reference issue numbers (`#406`, `#410`, `#412`). | Drop the numbers. | Low |
| 3 | importer | cross-file | U-A6 deletes the `ConnectionRoutes` facade and calls `CloudConnectionPolicy` directly, so every call here changes. | Retarget during the Gradle move. | Medium |
| 4 | all | ok | This is the security boundary for every renderer request; the case table (lookalike hosts, `@`-authority smuggling, `%2e`, IDN) is the valuable part. | Carry every row. | High if deleted |
| 5 | 1-156 | D8 | Lines up to ~400 characters; loops and checks on one line. | Split into named methods per surface (origin, managed routes, revocation, external, capabilities). | Low |

## Proposed end state
`ConnectionRoutesTest` in the Gradle connection-cloud suite with five methods, the same case tables, no retired
pairing flag-on case, no issue numbers. Node wrapper deleted. The instrumented test stays as device evidence.
