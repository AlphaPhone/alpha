# test/resident-native-ci-admission.test.mjs
- Lines: 143 | Kind: tooling (inline Python driving `scripts/ci/resident_native_source.py`, `resident_fixture.py`, `calendar-bridge.py`), source-text of a Gradle init script, and one real import of `scripts/resident-emulator-admission.ts` | Verdict: MERGE test 4 into `test/android-ci-tooling.test.mjs` (new, or the existing Android tooling suite); delete tests 1-3
- Covers: CI tamper refusals for generated native sources and APK archives; Calendar CI pin/hash constants; Gradle hash budget; emulator admission refuses a device that already has an Alpha package. Duplicates: `test/ci-pin-bound-scripts.test.mjs` also checks pinned CI scripts. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-92 | B5/T5 | 80 lines of Python in a template string verifying a hash-manifest verifier with synthetic data ("no APK/device proof"); evidence ceremony for the `resident-android.yml` lane. | Delete. | Low |
| 2 | 95-110 | T1 | Asserts `calendar-bridge.py` constants equal sha256 of `AlphaCalendarPlugin.java` and vendor files: fails on every edit of those files. | Delete; the bridge itself refuses drift at run time. | Low |
| 3 | 112-126 | T1 | Regexes a Gradle init script and compares a budget with a hard-coded measured byte count from one CI run. | Delete. | Low |
| 4 | 128-143 | keep | Imports the real `admitResidentEmulator` with a fake adb inventory; protects a real phone from fixture effects. | Keep as the one case; move. | Low |

## Proposed end state
Only the emulator-admission case survives, moved next to other Android CI tooling tests (same harness, no inline
Python). Whether `resident_native_source.py`/`resident_fixture.py` stay depends on the `resident-android.yml` decision
(ci-and-formal research: 0 green runs in 40).
