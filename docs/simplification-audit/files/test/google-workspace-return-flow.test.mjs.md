# test/google-workspace-return-flow.test.mjs
- Lines: 85 | Kind: integration on host JVM (javac of real `GoogleWorkspaceReturn.java`, `GoogleWorkspaceReturnFlow.java` and upstream `NativeProviderAdmission.java` with an inline Java driver written from a JS template string) + a compile check against `android.jar` | Verdict: KEEP case 1, moved to a Gradle JVM test; DELETE case 2
- Covers: the native Gmail/Workspace OAuth return is consumed exactly once, only for the pending nonce, the same credential/user/org binding and inside the TTL, survives cold recreation, and never stores the credential token. Duplicates: `google-workspace-return-native.test.mjs` (pure `GoogleWorkspaceReturn` predicate, a subset), `workspace-return-fallback.test.mjs`, `google-connection-return.test.mjs` (renderer side). Callers/importers: `npm test` glob; imports `test/fixtures/jvm-tools.mjs` (`nativeSource`, `upstreamAgentRuntime`, `javaBinary`, `jsonJar`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-63 | T9 / C3 | A whole Java test class lives in a JS template string with its own `mkdtemp`/javac/java plumbing instead of `runJvm` from `jvm-tools.mjs`. Failures report `check N`, not a name. | Move to `android/app/src/test/java/ai/alphacompute/alphaphone/GoogleWorkspaceReturnFlowTest.java` (JUnit, `testImplementation 'org.json:json'`), one `@Test` per paragraph (prepare/consume once, wrong nonce, TTL bounds, binding change, credential change during CAS, concurrent consumers, malformed pending, binding validation). | Medium: security-relevant callback admission |
| 2 | 69-77 | P3 | Compiling against `android-36/android.jar` duplicates what `:app:compile*` does in the APK build; fails hard (not skip) when the SDK is missing on a dev machine. | Delete. | Low |
| 3 | 44 | — | Uses `Long.MAX_VALUE`, threads and a latch: the concurrency case is the most valuable part. | Keep in the Gradle test. | — |

## Proposed end state
One Gradle JVM test class `GoogleWorkspaceReturnFlowTest` (merged with the pure-contract cases from
`google-workspace-return-native.test.mjs`) run by `:app:testStandaloneDebugUnitTest` in the Android lane. This file is
deleted. Until a Gradle JVM test source set exists, keep case 1 as is (it is real-code coverage) but call `runJvm`.
