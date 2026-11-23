# specs/quint/services/TaskSchedulerRuntime.qnt
- Lines: 219 | Kind: Quint model (live, `services/manifest.json`; upstream-only sources) | Verdict: KEEP (move to an upstream-pin lane); delete its legacy twin `legacy/CoreTaskScheduler.qnt` and harness `refinement/services/task-scheduler/index.mjs`
- Covers: the shared upstream task-scheduler daemon: two agent queues, registration generations, mixed-scope batched dispatch, busy-service exclusion, independent process tasks and their disposal. Duplicates: `specs/quint/legacy/CoreTaskScheduler.qnt` (same unit, older design; research §2.9). Callers/importers: `quint:check` via manifest; `refinement/services/task-scheduler/runtime.mjs` (imported by `refinement/services/index.mjs:39` and `test/quint-task-scheduler-runtime-refinement.test.mjs`); referenced in prose by `native/manifest.json:806`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.9 / P1 | Every `sources` entry is `vendor/eliza/packages/core/src/services/{task-scheduler,task}.ts` plus `scripts/core-state-patch.ts`. The model can only change meaning on an `upstream.lock.json` bump or a core-state-patch edit, yet runs on every PR. | Put this model and its harness in a lane triggered by `upstream.lock.json`, `vendor/eliza` pointer and `scripts/core-state-patch.ts` only; longer term move upstream (D14 follow-up). | Low |
| 2 | harness | T10 (none) | Harness `task-scheduler/module.mjs` bundles the real upstream classes with esbuild and appends a read-only observer to the module; it does not slice text. The appended `observeScheduler()` reads module-private names (`registry`, `dirtyAgents`, `activeTick` …), which is a name pin on upstream internals. | Keep. Ask upstream for an exported read-only snapshot so the appended observer can go. | Low |
| 3 | harness | B5 | `module.mjs` hashes every compiled input before and after (`captureInputs`, `Scheduler source changed during compilation`), and the test asserts `traces === 10`. | Drop mid-run re-hashing and exact counts (assert `> 0`). | Low |
| 4 | test | T4 | Runs twice: in the aggregate `refinement/services/index.mjs` and again in `test/quint-task-scheduler-runtime-refinement.test.mjs` (240 s timeout). | Run once, from the upstream-pin lane. | Low |
| 5 | — | P6 | `task-scheduler/index.mjs:7` drives `specs/quint/legacy/CoreTaskScheduler.qnt`, a second model of the same scheduler. | Delete the legacy model and that driver; this model is the current one. | Low |
| 6 | 13-19 | — | Bounds are tiny literal sets (`agentOf`, `agentOfRow`); fine as an abstraction, and the six `run` tests read well. | None. | — |

## Proposed end state
Model unchanged. One harness (`task-scheduler/runtime.mjs` + `module.mjs`, without receipts/rehashing), run only when the
upstream pin or core-state patch changes. `legacy/CoreTaskScheduler.qnt` and `task-scheduler/index.mjs` deleted.
