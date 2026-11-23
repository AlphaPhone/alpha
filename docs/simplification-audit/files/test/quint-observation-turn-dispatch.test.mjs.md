# test/quint-observation-turn-dispatch.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper (calls `checkObservationTurnDispatch` from `specs/quint/refinement/application/observation-turn-dispatch.mjs`) | Verdict: DELETE
- Covers: turn dispatch serializes optional observation after exact peer admission (20 traces; slices `connection-ui.tsx`, `local-agent.ts`, `phone-context.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-9 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | T10 | Driver slices `connection-ui.tsx`/`phone-context.ts`, which C4 edits (`phoneContextMessage`). | Re-run after C4; PORT to imports. | High |

## Proposed end state
Deleted. `ObservationTurnDispatch` keeps running once through the application campaign list in the manifest runner.
