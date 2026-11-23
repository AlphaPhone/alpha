# specs/quint/refinement/services/task-scheduler/README.md
- Lines: 95 | Kind: harness documentation | Verdict: REWRITE (~20 lines, runtime campaign only)
- Covers: documents both the historical `CoreTaskScheduler`/`CoreTaskSchedulerRestart` campaign (`index.mjs`, model in `specs/quint/legacy/`) and the live `TaskSchedulerRuntime` campaign (`runtime.mjs`) over upstream `vendor/eliza/packages/core/src/services/task-scheduler.ts` and `task.ts`. Duplicates: the `assumptions`/`obligations` strings in `index.mjs:112-131` and `runtime.mjs:150-163`. Callers/importers: none (documentation).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | A8 | Pins SDK `99b49439…`; `upstream.lock.json` is at `8876e369…`. Stale. | Drop the commit; the lock file is the pin. | None |
| 2 | 1-74 | P6 | Lines 1-74 describe the legacy single-agent campaign being deleted with `specs/quint/legacy`. | Delete with `index.mjs`/`fixture.mjs`. | None |
| 3 | 59-74, 89-95 | A8/B5 | Trace/checkpoint counts ("7 source traces at 63 checkpoints", "10 … 125 … 24") and "500 by 40 simulations" restate test numbers and go stale. | Remove counts. | None |
| 4 | 7-9, 94-95 | – | States the daemon is opt-in and Alpha never calls `startTaskScheduler`; confirmed by grep (only defined in `task-scheduler.ts`, no caller in `apps`, `android`, `scripts` or elsewhere in `vendor/eliza`). | Keep this sentence; it is the owner question for whether the model belongs here at all. | – |

## Proposed end state
Short note: what `runtime.mjs` executes (upstream scheduler + patched TaskService, controlled timer/DB/worker), the
observation table rows still true for the runtime fixture, the scope limits, and the fact the daemon is not enabled by
Alpha. Deleted entirely if the owner moves upstream-only models upstream.
