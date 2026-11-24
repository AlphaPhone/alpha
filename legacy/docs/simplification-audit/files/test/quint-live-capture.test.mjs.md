# test/quint-live-capture.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper (calls `checkLiveCapture` from `specs/quint/refinement/native/live-capture.mjs`) | Verdict: DELETE
- Covers: shared live capture fences late admission and keeps cancellation cleanup. Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac, 360 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-13 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `NativeLiveCapture` keeps running once through the native campaign list in the manifest runner.
