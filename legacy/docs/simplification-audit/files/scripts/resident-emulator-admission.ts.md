# scripts/resident-emulator-admission.ts
- Lines: 31 | Kind: CI/emulator safety helper | Verdict: KEEP
- Covers: before credentials/APKs touch an emulator, require an explicit disposable ARM64 emulator with no Alpha package; remove only the fixture user this run created. Duplicates: none. Callers/importers: `scripts/android-resident-instrumentation.ts:11`; `test/resident-native-ci-admission.test.mjs:129`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | A1 | The package regex still admits the old `ai.elizaresearch` id as "existing installation"; harmless and a reasonable refusal for a shared emulator. | Keep. | — |
| 2 | whole | — | One caller plus one test of a CI gate; small and clear. Could be inlined into `android-resident-instrumentation.ts`, but the test imports it without spawning adb, which is a reason to keep the module. | Keep as is. | — |

## Proposed end state
Unchanged.
