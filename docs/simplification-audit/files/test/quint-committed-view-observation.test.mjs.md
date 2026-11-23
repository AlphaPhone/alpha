# test/quint-committed-view-observation.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkCommittedViewObservation` from `specs/quint/refinement/application/committed-view-observation.mjs`) | Verdict: DELETE
- Covers: the committed-view observer refines host settlement and cache ownership (18 traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |

## Proposed end state
Deleted. `CommittedViewObservation` keeps running once through the application campaign list in the manifest runner.
