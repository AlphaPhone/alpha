# test/quint-native-calendar-scoped-review.test.mjs
- Lines: 23 | Kind: Quint refinement wrapper (calls `checkNativeCalendarScopedReview` from `specs/quint/refinement/native/scoped-calendar-review.mjs`) | Verdict: DELETE
- Covers: native Calendar review retires a held ticket across pause or destruction (19 traces). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-22 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 10-22 | T5 | Assertions on model `expect` values of named traces. | Gone. | None |

## Proposed end state
Deleted. `NativeCalendarScopedReview` keeps running once through the native campaign list in the manifest runner.
