# test/quint-permission-choices.test.mjs
- Lines: 24 | Kind: Quint refinement wrapper (calls `runPermissionChoicesRefinement` from `specs/quint/refinement/application/permission-choices.mjs`) | Verdict: DELETE
- Covers: the startup permission coordinator refines the bounded walkthrough model (40 fields, 20 named scenarios). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`; `quint-permission-coordinator-refinement.test.mjs` has the same test title and 12 of its 12 scenario names appear here (tests-host research). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-23 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 11-22 | B5 | 20 literal scenario names asserted present. | Gone. | None |
| 4 | — | T4 | `startup-permissions-coordinator.mjs` (501 lines) is a near-copy of this 559-line driver. | Merge the coordinator driver into `permission-choices.mjs`; delete `StartupPermissionsCoordinator` if its model is a sub-model. | Medium |

## Proposed end state
Deleted. `PermissionChoices` keeps running once through the application campaign list in the manifest runner.
