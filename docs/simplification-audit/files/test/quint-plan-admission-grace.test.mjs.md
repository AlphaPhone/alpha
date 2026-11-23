# test/quint-plan-admission-grace.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkPlanAdmissionGrace` from `specs/quint/refinement/services/plan-admission-grace.mjs`) | Verdict: DELETE
- Covers: Alpha and shared admission enforce bounded credential-bound plan grace (30 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 10 | B5 | Coverage bookkeeping (8 named, 6 witnesses, 2 canaries). | Gone. | None |

## Proposed end state
Deleted. `PlanAdmissionGrace` keeps running once through the services campaign list in the manifest runner.
