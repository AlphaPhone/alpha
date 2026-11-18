# test/power-sense-entry.test.mjs
- Lines: 113 | Kind: source-text (manifest regex) + host-JVM integration of the real `AlphaAssistActivity.java` and `AlphaPowerVoiceActivity.java` against stubbed `MainActivity`/`SenseListenerClient` + an Android-36 compile check | Verdict: MERGE test 2 into the Gradle JVM lane; move test 1 into `scripts/verify-apks.ts`; DELETE test 3
- Covers: the Power child activity offers a Power launch only on a warm, bridged, same-owner instance; cold, restored and ordinary Assist entries fail closed. Duplicates: `specs/quint/refinement/native/assistant-entry{,-platform}.mjs` (AssistantEntry model) and `test/apk-alpha-power-policy.test.mjs` (built-APK policy). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-36 | T1 | Regex over `AndroidManifest.xml`: Power activity disabled, unexported, `STATUS_BAR_SERVICE`-protected, no intent filter; Assist activity unprotected with `ASSIST` filter. Real release rules. | Move to `scripts/verify-apks.ts` (merged manifest of the built APK); `test/apk-alpha-power-policy.test.mjs` already reads the APK policy, so check overlap first. | Low |
| 2 | 38-99 | keep | Compiles the two real activities and drives 20+ lifecycle checks. Overlaps the AssistantEntry Quint replay, which also compiles these activities. | Keep only the cases the replay does not hit (API-35 two-arg `onNewIntent` delegates once; Capacitor load bounce never re-offers); move to Gradle JVM. | Low |
| 3 | 102-113 | B5 | API-36 compile of real sources with stubs. Gradle compiles them for real. | Delete. | Low |
| 4 | 12-23 | C3 | SDK discovery/`workspace`/`javac` copy of `power-cold-native-pin.test.mjs:16-28`. | Shared helper or Gradle. | Low |

## Proposed end state
Manifest rules checked on the built APK by `verify-apks`. A Gradle JVM `PowerEntryTest` with the shared stub set,
limited to cases the `AssistantEntry` refinement does not already replay. File deleted.
