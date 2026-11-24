# test/quint-development-digest-pending.test.mjs
- Lines: 20 | Kind: Quint refinement wrapper (calls `checkDevelopmentDigestPending` from `specs/quint/refinement/services/development-digest-pending.mjs`) | Verdict: DELETE
- Covers: development digest phase changes keep the reviewed payload and raw CAS (7 traces; `hosted-digest-ui.tsx`, `hosted-digests.ts`). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-19 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 12-19 | T5 | Asserts model `expect` values of named traces. | Gone. | None |
| 4 | 13-15 | A1 | Trace "legacy retry retains original expected bytes" models the older-build `Pending.phase` handling that B297/C6 delete. | When B297 lands, remove that trace from the driver and model. | Medium |

## Proposed end state
Deleted. `DevelopmentDigestPending` keeps running once through the services campaign list in the manifest runner.
