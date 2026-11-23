# test/workspace-return-fallback.test.mjs
- Lines: 35 | Kind: host-JVM integration (compiles real `GoogleWorkspaceReturn.java`, `GoogleWorkspaceReturnFlow.java` and upstream `NativeProviderAdmission.java` with an inline Java main written from a JS template) | Verdict: KEEP, move to Gradle JVM test (merge with `google-workspace-return-flow.test.mjs` / `google-workspace-return-native.test.mjs` into one `GoogleWorkspaceReturnTest`)
- Covers: Connect Google falls back to the manual return on transient identity failures (408/429/5xx/404, timeout, DNS, bad body) and stops on 401/403, unsuccessful identity, mismatch or expired key. Duplicates: `test/google-workspace-return-flow.test.mjs`, `test/google-workspace-return-native.test.mjs` (same classes, same harness style). Callers/importers: `npm test` glob; `fixtures/jvm-tools.mjs` (`nativeSource`, `upstreamAgentRuntime`, `runJvm`, `jsonJarSkip`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T9 | `skip: jsonJarSkip`: silently skipped without the jar. | Gradle dependency. | Low |
| 2 | 14-31 | C7 | Java source in a JS template; success is a stdout `PASS … 15` count (B5). | JUnit parameterised test. | None |
| 3 | 15 | T5-adjacent | Compiles upstream `NativeProviderAdmission.java` from `vendor/eliza` to get `CloudReadFailure`; in Gradle it is already on the classpath. | No change needed after the move. | None |

## Proposed end state
A JUnit `GoogleWorkspaceReturnTest` in `android/app/src/test` holding the fallback table and the cases of the two sibling host files; this wrapper is deleted.
