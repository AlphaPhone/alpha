# test/quint-fact-write-scope.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper (calls `runFactWriteScopeRefinement` from `specs/quint/refinement/services/fact-write-scope.mjs`) | Verdict: DELETE
- Covers: fact writes refine room lanes, lookup eviction and known rejection (6 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-11 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `FactWriteScope` keeps running once through the services campaign list in the manifest runner.
