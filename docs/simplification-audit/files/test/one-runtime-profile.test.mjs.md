# test/one-runtime-profile.test.mjs
- Lines: 98 | Kind: tooling + source-text (imports `scripts/build-android.ts`, `stage-local-agent-runtime.ts`, `removed-profile-flags.ts`, `android-build-preflight.ts`; spawns 6 node scripts and one Python script; regex over `vite.config.ts`, `build-flags.ts`, `product.gradle`, `local-speech/build.gradle`, `AlphaLocalAgentPlugin.java`, `native-cloud-runtime.ts`, `stage-local-agent-runtime.ts`, `runtime-profile.ts` and three `vendor/eliza` files) | Verdict: DELETE
- Covers: the removed `--runtime-profile` / `--local-embeddings` flags are refused with one line everywhere, and every build/launch uses the single native profile. Duplicates: `test/android-build-path.test.mjs:146`, `test/upstream-pin-guard.test.mjs:117` (list `removed-profile-flags.ts`); `scripts/verify-packaged-runtime.py`, `runtime-profile.ts --verify-native` and the Gradle verification tasks enforce the packaged profile at build time. Callers/importers: `npm test` glob. Research bucket "F+A, keep, fold into python runner" is wrong: only one assertion touches Python.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-36 | A8 | Tests a tombstone: refusal stubs for flags removed earlier (`scripts/removed-profile-flags.ts`, verdict DELETE in its own report). | Delete the test with the stub and the refusal lines in `verify-packaged-runtime.py`, `runtime-profile.ts`, `build-archive.ts`, Gradle. Unknown flags then fail through each parser's normal "Unknown option". | Low |
| 2 | 27-35 | T9 | Spawns 7 processes (60 s timeout each) to read a stderr line. | Gone. | None |
| 3 | 48-50, 53-76, 78-85, 87-93, 97 | T1, T5 | Regex over Gradle, Java, TS scripts and `vendor/eliza` source (counts `missedOccurrences: "record"` occurrences). | Delete. The packaged result is checked by `verify-apks` / `runtime-profile.ts --verify-native` on real build output. | Low |
| 4 | 38-46 | - | `gradleFlagArgs` / `buildEnv` strip stale profile env vars. | Delete with the tombstone; env scrubbing for names nothing sets is itself A8. | Low |
| 5 | 95-96 | T3 | `preparedRuntimeProblems` reports a missing prepared source. | Covered by `android-build-preflight` tooling tests; drop. | Low |

## Proposed end state
Deleted together with `scripts/removed-profile-flags.ts` and the profile-refusal lines in the scripts and Gradle. The single-profile guarantee stays enforced by the build itself (`runtime-profile.ts --verify-native`, `verify-apks`).
