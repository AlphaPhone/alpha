# test/quint-cloud-plan-recheck.test.mjs
- Lines: 16 | Kind: Quint refinement wrapper (calls `checkCloudPlanRecheck` from `specs/quint/refinement/application/cloud-plan-recheck.mjs`) | Verdict: DELETE
- Covers: Cloud return guards keep minute limits, current scope and owner cancellation (7 traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-15 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 5,13 | B5 | `verifyRefinementReceiptInputs` and `generatedSourceSnapshots` count check receipt bookkeeping, not behaviour. | Gone. | None |
| 4 | — | T10 | Driver strips types and slices `connection-ui.tsx` into `vm` (text markers). | PORT in the harness: needs the plan-recheck guard exported from the `connection-ui` split (`runtime/connection/plan-recheck.ts`). | Medium |

## Proposed end state
Deleted. `CloudPlanRecheck` keeps running once through the application campaign list in the manifest runner.
