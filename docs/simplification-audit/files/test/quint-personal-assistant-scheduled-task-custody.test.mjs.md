# test/quint-personal-assistant-scheduled-task-custody.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkPersonalAssistantScheduledTaskCustody` from `specs/quint/refinement/services/personal-assistant-scheduled-task-custody.mjs`) | Verdict: DELETE
- Covers: selected Personal Assistant scheduling policies refine the pinned SQL custody model (8 traces; upstream SDK). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | P1 | Upstream-only source. | Select on `upstream.lock.json`. | Low |

## Proposed end state
Deleted. `PersonalAssistantScheduledTaskCustody` keeps running once through the services campaign list in the manifest runner.
