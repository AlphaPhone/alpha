# test/reset-cloud-revocation.test.mjs
- Lines: 61 | Kind: host-JVM integration (real `ResetBeforeDispatch`, upstream `CloudKeyRevocation`, `DataReset`) | Verdict: KEEP, MOVE to Gradle `ResetBeforeDispatchTest.java`
- Covers: The reset step revokes each saved Cloud key once, per registered environment, skips an unreadable store, and stays within the reset budget. Duplicates: `reset-startup.test.mjs` stubs the same revocation step. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18 | helpers | Resolves `android.jar` from `ANDROID_HOME` or `~/Android/Sdk` itself. | Gradle provides the classpath. | Low |
| 2 | 22-53 | T7-ish | Stubs and Java fixture in JS template strings. | Java test sources. | Low |
| 3 | 50 | T8 | Blocking transport sleeps 10 s; the test checks the step returns under 2 s. | Keep, but use a latch instead of `Thread.sleep`. | Low |

## Proposed end state
- One Gradle test class.
