# test/quint-core-shutdown.test.mjs
- Lines: 15 | Kind: Quint refinement wrapper (calls `runCoreRuntimeShutdownRefinement` from `specs/quint/refinement/services/core-runtime/shutdown.mjs`) | Verdict: DELETE
- Covers: upstream `AgentRuntime` shutdown admission and strict retirement (13 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob; the driver binds this file's path as a hashed source (`loadAgentRuntime([..., 'test/<this file>'])`); deleting the file without removing that literal makes `captureInputs` fail (`core-runtime/shutdown.mjs:133`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-14 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 13-14 | C5 | Repeated unobserved-field inventory check. | Generic runner check. | Low |

## Proposed end state
Deleted. `CoreRuntimeShutdown` keeps running once through the services campaign list in the manifest runner.
