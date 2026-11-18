# test/quint-native-calendar-sync-enable.test.mjs
- Lines: 34 | Kind: Quint refinement wrapper (calls `checkNativeCalendarSyncEnable` from `specs/quint/refinement/native/calendar-sync-enable.mjs`) | Verdict: DELETE
- Covers: native Calendar pause retires old consent before the enabled CAS (9 traces). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-33 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 11-33 | T5 | 20 assertions on model `expect` values. | Gone. | None |
| 4 | — | Owner | Models the Android `CalendarSync*` bridge that D18 keeps pending Q-CAL-1. | If the owner retires the Android sync, delete the model and driver with it. | Low |

## Proposed end state
Deleted. `NativeCalendarSyncEnable` keeps running once through the native campaign list in the manifest runner.
