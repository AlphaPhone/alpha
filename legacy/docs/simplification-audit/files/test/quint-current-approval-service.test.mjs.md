# test/quint-current-approval-service.test.mjs
- Lines: 18 | Kind: Quint refinement wrapper (calls `checkCoreApprovalServiceCurrentRefinement` from `specs/quint/refinement/services/current-approval-service.mjs`) | Verdict: DELETE
- Covers: current upstream approvals refuse orphan callbacks and drain admitted work before stop (15 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 10-18 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 14-18 | C5, B5 | Inventory check plus five literal field names. | Generic runner check; drop the list. | Low |

## Proposed end state
Deleted. `CoreApprovalServiceCurrent` keeps running once through the services campaign list in the manifest runner.
