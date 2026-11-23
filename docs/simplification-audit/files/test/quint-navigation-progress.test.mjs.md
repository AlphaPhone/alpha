# test/quint-navigation-progress.test.mjs
- Lines: 30 | Kind: Quint refinement wrapper (calls `checkNavigationProgress` from `specs/quint/refinement/native/navigation-progress.mjs`) | Verdict: DELETE
- Covers: Maps guidance cursor, reroute and background ownership (`maps/background-navigation.ts`, `screen.ts`, `maps-adapter.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the native aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-29 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 14-29 | T5 | 14 assertions on model `expect` values. | Gone. | None |

## Proposed end state
Deleted. `NavigationProgress` keeps running once through the native campaign list in the manifest runner.
