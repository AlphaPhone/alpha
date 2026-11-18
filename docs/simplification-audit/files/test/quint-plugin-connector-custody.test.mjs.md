# test/quint-plugin-connector-custody.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkCoreConnectorCustody` from `specs/quint/refinement/services/core-runtime/connector-custody.mjs`) | Verdict: DELETE
- Covers: upstream plugin connector custody retires old publication and keeps current owners (10 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 9 | B5 | Pins the step length of every trace `[6,5,4,5,4,4,3,2,4,4]`. | Gone. | None |
| 4 | — | P1 | Upstream-only. | Select on `upstream.lock.json`. | Low |

## Proposed end state
Deleted. `CoreConnectorCustody` keeps running once through the services campaign list in the manifest runner.
