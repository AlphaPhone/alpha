# test/reset-wiring.test.mjs
- Lines: 71 | Kind: Java compile-and-run on host JVM (real Alpha + upstream reset classes against stub Capacitor/AndroidX) + source-text | Verdict: DELETE
- Covers: Alpha's reset plugin/recovery activity subclass the shared upstream reset classes, carry Alpha names and copy, and Settings/Application/MainActivity wire them in a fixed order. Duplicates: `android/app/src/androidTest/.../ResetPolicyInstrumentedTest.java`, `ResetExternalFixtureInstrumentedTest.java` (device), `specs/quint/refinement/native/reset-orchestration.mjs` (`ResetOrchestrationTraces.java`), `test/reset-cloud-revocation.test.mjs`. Callers/importers: `npm test` glob only; imports `test/fixtures/jvm-tools.mjs`, `scripts/prepare-patched-native.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-62 | T3/T1 | Compiles real classes but the checks are `isAssignableFrom`, annotation name and string `equals/contains` on `DataResetCopy` constants: a check of constants. Class wiring and signatures are already proven by `npm run android:build`. | Delete. | Low |
| 2 | 46-50 | T3 | Only behavioural check: `recoveryBody(...)` never claims deletion over 18 combinations. That method is upstream (`plugin-native-system reset`), so it belongs to upstream tests (comment at 9-10 says so). | Delete; if wanted, one assertion in `ResetPolicyInstrumentedTest` on the rendered recovery text. | Low |
| 3 | 63-71 | T1 | Regex over `settings-adapter.ts`, `AlphaApplication.java`, `MainActivity.java` with `indexOf` ordering. Breaks on reformat. | Delete. | Low |
| 4 | 17,59 | T8 | Hard-codes `platforms/android-36/android.jar` under `ANDROID_HOME`; javac with 120 s timeout over ~30 files. | Goes with the file. | Low |
| 5 | 26-28 | C3 | Stubs `AlphaCloudSignInPlugin`, `AlphaCredentialStore` (legacy `readSlotBeforeAttach`, C5) by hand. | Goes with the file. | Low |

## Proposed end state
File deleted. Reset admission order and the recovery copy are covered on device by `ResetPolicyInstrumentedTest`
and by the Quint reset-orchestration refinement; compile wiring by the Android build. Upstream owns the copy rules.
