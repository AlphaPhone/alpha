# test/connection-routes.test.mjs
- Lines: 78 | Kind: host-JVM integration (test 1: javac of real `CloudDeployment.java`, upstream `CloudConnectionPolicy.java`, `ConnectionRoutes.java` + `test/fixtures/ConnectionRoutesTest.java`) plus source-text (tests 2–5: regex/indexOf over `AlphaConnectionPlugin.java`, `AlphaLocalAgentPlugin.java`, `AlphaDataReset.java`, `ResetBeforeDispatch.java`, `AlphaApplication.java`, `apps/app/src/runtime/local-agent.ts` and four `vendor/eliza` Java files) | Verdict: KEEP test 1 (MOVE to Gradle JVM tests); DELETE tests 2–5
- Covers: native renderer-transport route policy (production refuses pairing and non-Cloud origins, DELETE only for Cloud self-revocation, header allowlist, external host rules). Duplicates: none for the policy; tests 2–5 assert source order only. Callers/importers: `npm test` glob; `test/fixtures/ConnectionRoutesTest.java` is imported only here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | — | Real policy compiled and run; the right kind of test, in the wrong harness (javac per test, P6). | Move `ConnectionRoutesTest` to `android/app/src/test/java/.../ConnectionRoutesTest.java` (JUnit, `testDebugUnitTest`) in a `connection-cloud` JVM class. | Low |
| 2 | 15-29 | T1 | Asserts the order of statements inside `AlphaConnectionPlugin.request()` and the exact text of the guard line, and that no credential-slot identifier appears. Breaks on reformat. | Delete. The ordering is a code-review property; the policy itself is test 1. | Low |
| 3 | 32-39 | T1 | Same for `openExternal`. | Delete. | Low |
| 4 | 42-62 | T1 / T5 | Reset-data ordering read from `vendor/eliza` `DataResetPlugin.java`/`DataReset.java`/`CloudKeyRevocation.java` (comment says the behaviour is tested upstream in `reset.test.mjs`). Also contains a historical `#406` comment (A8). | Delete; upstream owns it. The Alpha wiring (`ResetBeforeDispatch.STEP`) is a one-line registration. | Low |
| 5 | 63-73 | T1 | Own-key setup uses native configuration: regex over Java and over `local-agent.ts`. | Delete; `journeys/settings.spec.ts` (AI provider) on the production project checks no renderer secret is written. | Low |
| 6 | 74-78 | T1 | "No credit-balance route" text check. | Delete; if it is a release rule, `verify-apks` can grep the dex strings. | Low |

## Proposed end state
Only the JVM policy run survives, as a Gradle JVM test next to the other connection/credential JVM tests
(`credential-owner-admission`, `credential-slot-lock-order`, `credential-stop-dispatch`). Requires a `testImplementation`
JUnit dependency and the upstream `CloudConnectionPolicy` on the test classpath (it already is on the app classpath).
