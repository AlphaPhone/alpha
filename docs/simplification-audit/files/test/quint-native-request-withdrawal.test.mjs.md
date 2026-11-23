# test/quint-native-request-withdrawal.test.mjs
- Lines: 18 | Kind: Quint refinement wrapper (calls `checkNativeRequestWithdrawal` from `specs/quint/refinement/native/request-withdrawal.mjs`) | Verdict: DELETE
- Covers: renderer withdrawal and three native requests refine the two-worker model (42 traces). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the native aggregate already runs (esbuild + javac; ≈51 s measured). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-17 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 15-16 | B5 | Pins coverage bookkeeping (5 named, 5 witnesses, 3 canary names). | Gone. | None |

## Proposed end state
Deleted. `NativeRequestWithdrawal` keeps running once through the native campaign list in the manifest runner.
