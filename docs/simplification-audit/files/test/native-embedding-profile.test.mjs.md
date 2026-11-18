# test/native-embedding-profile.test.mjs
- Lines: 43 | Kind: source-text (4-24: regexes over `AlphaLocalAgentPlugin.java`, vendor `NativeProviderSlot.java`, `android/consumer-host.json`) + host-JVM run of the upstream `NativeRuntimeEmbeddings` (25-43) | Verdict: DELETE
- Covers: Alpha selects on-device embeddings only through the shared runtime profile; the shared class keeps native embeddings local and gates on assets. Duplicates: `test/agent-embedding-overrides.test.mjs` (host launcher embedding route), upstream `plugin-native-agent` tests. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-24 | T1 | Exact-line match of `NativeProviderSlot.applyLaunchEnvironment(...)` call and index ordering in vendor source; manifest inclusion checks. | Delete. A missing helper in `consumer-host.json` fails the Android build. | Low |
| 2 | 25-43 | T5 | Tests upstream `NativeRuntimeEmbeddings.apply` with a fake files/libs tree. | Delete; upstream follow-up. | Low |

## Proposed end state
File deleted. On-device embedding selection is an APK/instrumentation item; upstream owns the profile class.
