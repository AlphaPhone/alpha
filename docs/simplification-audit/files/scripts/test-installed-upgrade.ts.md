# scripts/test-installed-upgrade.ts
- Lines: 141 | Kind: device test runner (installs a baseline APK pair in an isolated Android user on an owned emulator, upgrades to the admitted candidate pair, runs seed/verify instrumentation phases and companion classes; uses upstream `isolated-android-test.mjs`, `isolated-android-user.mjs`, `device-lease.ts`) | Verdict: SIMPLIFY: delete the calendar branch, `--bridge` and the `legacy-digest` companion (C7 / A23 / A55); keep the reminder upgrade, or fold it into `scripts/pilot-update.ts` (owner question)
- Covers: an installed APK update keeps reminder identity, receipts and native reminder intent routes (reminder); calendar identity across upgrade (calendar, seeded against a baseline that still had `CalendarEventGuard`). Emulator-class evidence only, not run by CI. Duplicates: `scripts/pilot-update.ts` generalises the same update-keeps-data check to every app-data domain on a provisioned unit. Callers: `scripts/android-instrumentation.ts:297,310` (registry text/listing for `WorkflowLegacyReminderUpgrade`), `scripts/owner/emulator-campaign-check.ts:68` (text), `scripts/pilot-update.ts:9` (comment), `test/installed-upgrade-runner.test.mjs:69,163` (spawns it with fake env), `test/android-instrumentation-runner.test.mjs:558-559` (asserts registry text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 68-70, 108-112, 118 | A1 | Calendar branch seeds `CalendarEventGuard`, which no longer exists in main (A23): it can only pass against a pre-extraction baseline. `--bridge` companion (`CalendarAgentCrudInstrumentedTest`) rides on it. | Delete the calendar kind, `--bridge`, `CalendarUpgradeInstrumentedTest.java`. | L |
| 2 | 38, 115-117 | A1 | `legacy-digest` companion runs `WorkflowLegacyReminderUpgradeInstrumentedTest` whose seeds come from the old package's data (A55, C7). | Delete the companion and the class; drop the registry row. | L |
| 3 | 51, 94-95 | C3 | Local `sha()` helper (another SHA-256 twin) and re-hashing admitted APKs before each companion (B5 evidence ceremony after admission). | Shared `scripts/lib` hash; one admission check. | L |
| 4 | 12-30, 88, 102, 129 | B5 | `UpgradeReceipt` written to `result.json` repeatedly; nothing reads it except humans. | Keep one final write or rely on exit code and logs. | L |
| 5 | 31 | C3 | `message(error)` helper duplicated across scripts. | Shared helper. | L |
| 6 | — | T5 | `test/installed-upgrade-runner.test.mjs` tests this runner's argument/env handling, and `android-instrumentation-runner.test.mjs:558-559` asserts registry strings. | Delete both test parts with the simplification (tooling not gating a release). | L |
| 7 | 41-135 | D8/D9 | One 95-line function with nested callbacks four deep. | After removing calendar, flatten into `admit`, `runVariant`, `verifyRoutes`. | L |

## Proposed end state
A reminder-only `installed-upgrade` runner (~70 lines) or, if the owner agrees, deletion in favour of `scripts/pilot-update.ts` as the single "update keeps data" check that C7 asks to keep. Registry text, campaign-check row and the two runner tests updated accordingly.
