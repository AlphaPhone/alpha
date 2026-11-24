# test/quint-keyboard-dictation-cloud.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkKeyboardDictationCloud` from `specs/quint/refinement/native/keyboard-dictation-cloud.mjs`) | Verdict: DELETE
- Covers: native dictation routes, stale replies and audio cleanup refine the selected-route model (31 traces). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac, 180 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `KeyboardDictationCloud` keeps running once through the native campaign list in the manifest runner.
