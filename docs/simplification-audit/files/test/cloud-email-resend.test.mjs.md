# test/cloud-email-resend.test.mjs
- Lines: 38 | Kind: unit (`emailCodeResendAt` in `scripts/cloud-email-code.ts`) + JVM (compiles 4 upstream auth classes and runs a generated main) + source-text (`assertBefore` over upstream `CloudSignInPlugin.java` and `scripts/browser-cloud-dev-bridge.ts`) | Verdict: DELETE test 3; MOVE tests 1-2 upstream (D14) or keep test 2 only
- Covers: email resend waits at least 30 s and never shortens a server `Retry-After`/reported deadline, identically in the dev bridge (TS) and the shared native client (Java). Duplicates: `test/browser/native-cloud-signin.spec.ts` (resend countdown in the browser). Callers/importers: `npm test` glob only; uses `test/fixtures/jvm-tools.mjs`, `test/fixtures/assert-order.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-38 | T1 | `includes('connection.getHeaderField("Retry-After")')` and statement-order checks in two files, one upstream. | Delete. | None |
| 2 | 20-30 | T5 | The Java under test is `vendor/eliza/packages/auth/android` (upstream). Comparing a dev-bridge TS copy against it is the reason for the test (C7: two implementations). | Upstream follow-up: the shared client owns its test. Here, keep one case that the dev bridge agrees with the native deadline table, or delete with the dev bridge simplification. | Low |
| 3 | 17-19 | T3 | Pure table of the TS copy. | Fold into test 2's shared case table. | None |

## Proposed end state
Source-order checks deleted; at most one cross-implementation table remains until the dev bridge reuses upstream's
deadline logic or the check moves upstream.
