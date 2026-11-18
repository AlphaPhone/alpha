# test/native-campaign-evidence.test.mjs
- Lines: 182 | Kind: tooling (runs `scripts/android-workflow-native.ts` against the fake adb/emulator of `test/fixtures/isolated-native-campaign.mjs`) | Verdict: MERGE 4 cases into `test/tooling/native-campaign.test.mjs` (or DELETE with the script)
- Covers: the manual workflow/approval-notice instrumentation campaign runs each case in a disposable user, scopes permissions, records which APK pair each case ran on, and fails loudly on skipped/forged evidence. Duplicates: the same fixture drives `native-restart-runner`, `native-reminder-runner`, `native-reminder-recovery-runner`, `native-permission-runner`, `calendar-regression-runner`, `native-webview-admission` tests (same assertions on users/cleanup). Callers/importers: `npm test` glob. `scripts/android-workflow-native.ts` is not run by CI or any package script (scripts research: "owner decision: manual device campaign").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-97 | B5 | Exact-count evidence ceremony: 24 results, 28 instrument calls, 120 permission commands, ordered method lists. Any added test case breaks it. | Replace with: every selected case passed and its user was removed; nothing left on the device. | Low |
| 2 | 98-128, 152-182 | - | Selection semantics (phase/variant never reads as whole campaign), first failure stops and names itself. | Keep 2 cases. | Low |
| 3 | 129-150 | T7 | Seven evidence-forgery modes and four transport/termination modes, one test each. | Collapse to one table: forged evidence rejected; archive changed after admission refused before install. | Low |
| 4 | - | A7 | If the owner retires the manual campaign script, delete this test with it. | Owner question. | - |

## Proposed end state
If the script stays: four cases in a shared `test/tooling/native-campaign.test.mjs` that also absorbs the other runner tests
using `isolated-native-campaign.mjs`. If the script goes: file deleted with it.
