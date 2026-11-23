# test/quint-native-assistant-entry.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (calls `checkNativeAssistantEntry` from `specs/quint/refinement/native/assistant-entry.mjs`) | Verdict: DELETE
- Covers: native assistant Activities and tile entry paths (35 traces; D7 keeps these PRD-planned entries). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-11 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `NativeAssistantEntry` keeps running once through the native campaign list in the manifest runner.
