# test/quint-native-navigation-ownership.test.mjs
- Lines: 32 | Kind: Quint refinement wrapper (calls `checkNativeNavigationOwnership` from `specs/quint/refinement/native/navigation-service.mjs`) | Verdict: DELETE
- Covers: native Maps service keeps terminal and notification authority with the exact session. Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac, 180 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-31 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 14-31 | T5 | 17 assertions on model `expect` values of named traces. | Gone. | None |

## Proposed end state
Deleted. `NativeNavigationOwnership` keeps running once through the native campaign list in the manifest runner.
