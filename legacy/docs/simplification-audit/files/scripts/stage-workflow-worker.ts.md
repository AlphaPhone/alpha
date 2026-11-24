# scripts/stage-workflow-worker.ts
- Lines: 13 | Kind: build stage (npm `agent:stage-workflow-worker`) | Verdict: KEEP, SIMPLIFY
- Covers: copies the built workflow worker artifact into `android/app/src/main/assets/agent/workflow-worker` after checking its source stamp and lock hash. Duplicates: none. Callers: `package.json` `agent:stage-workflow-worker`; spawned by `scripts/stage-local-agent-runtime.ts:69`; listed in `quint-lib.ts:22`, `source-snapshot.ts:48`; Quint `specs/quint/refinement/services/workflow-worker-staging.mjs:175` and `specs/quint/services/manifest.json:2301` pin it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P3 | Runs `prepare-local-agent.ts --source-only` again although its main caller just ran it twice. | Export `stageWorkflowWorker(root)` (stamp+lock+stage) and call it from `stage-local-agent-runtime.ts` by import; the npm entry keeps the prepare check for standalone use. | Low |
| 2 | 13 | B5 | Prints `androidExecution:false` evidence field. | Drop. | — |

## Proposed end state
An exported function plus a 3-line CLI guard. Check whether the Quint harness reads the text before
reshaping (it lists it as a source; retarget if it slices).
