# test/quint-inbox-coordinator.test.mjs
- Lines: 32 | Kind: Quint refinement wrapper (calls `runInboxCoordinatorRefinement` from `specs/quint/refinement/services/inbox-coordinator.mjs`) | Verdict: DELETE
- Covers: Inbox source coordination: grant, confirmation, attachment and recovery (18 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-28 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 10-21 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 6-31 | T9 | `node -e` child program with stdout regex. | Gone. | None |

## Proposed end state
Deleted. `InboxCoordinator` keeps running once through the services campaign list in the manifest runner.
