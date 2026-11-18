# test/quint-google-browser-return-claim.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper (calls `checkGoogleBrowserReturnClaim` from `specs/quint/refinement/native/google-browser-return-claim.mjs`) | Verdict: DELETE
- Covers: the native Google browser result owns its claim across both grace timers (23 traces). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-12 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `GoogleBrowserReturnClaim` keeps running once through the native campaign list in the manifest runner.
