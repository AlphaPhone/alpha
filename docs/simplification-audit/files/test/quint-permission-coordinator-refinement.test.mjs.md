# test/quint-permission-coordinator-refinement.test.mjs
- Lines: 20 | Kind: Quint refinement wrapper (calls `runStartupPermissionsCoordinatorRefinement` from `specs/quint/refinement/application/startup-permissions-coordinator.mjs`) | Verdict: DELETE
- Covers: same title and behaviour as `quint-permission-choices` over a 20-field projection (12 named scenarios). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`; every scenario name here is also asserted in `quint-permission-choices.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-19 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | T4 | Two drivers of one coordinator. | Merge the driver into `permission-choices.mjs`. | Medium |

## Proposed end state
Deleted. `StartupPermissionsCoordinator` keeps running once through the application campaign list in the manifest runner.
