# specs/quint/refinement/services/workflow-scheduler/index.mjs
- Lines: 165 | Kind: Quint refinement harness (integration: upstream `EmbeddedWorkflowService` on PGlite with a controlled clock) | Verdict: KEEP (upstream-only; lane-gate on `upstream.lock.json`), SIMPLIFY
- Covers: 14 bounded schedules of `WorkflowWakeups.qnt`: a timer event arms one callback and resumes the same run, reopened timer IDs use the latest open occurrence, a signal resume replaces or retains the timer, a terminal or cancelled row makes an old timer inert, a live-worker poll is withdrawn on an unknown outcome, stop clears the timer and an already-queued callback is inert, restart recovers, an empty timer history falls back, a far timer is clamped, and typed occurrences are missed after the window or a started one reconciles. Duplicates: none in repo. Upstream plugin-workflow owns the code. Callers/importers: `specs/quint/refinement/services/index.mjs:29` (aggregate) and `test/quint-workflow-wakeups-refinement.test.mjs` (spawns a child `node -e` and asserts exact 14 traces / 72 checkpoints).

Model is live (manifest `WorkflowWakeups`, sole source `vendor/eliza/plugins/plugin-workflow/src/services/embedded-workflow-service.ts`, present). This is an upstream-only model (research §2.9).

Product text read: none (bundled through `workflow-engine/ports.mjs`). The harness relies on upstream private members `service.workerReconciliations` (`dueAtMs`), `service.reconciliationStopped`, `service.running` and `service.signalExecution`, and on the event types `TimerCreated`/`TimerFired` with `payload.timerId`/`firesAtMs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6/§2.9 | Upstream-only model runs on every PR. | Gate on `upstream.lock.json` and the model/harness paths, or move it upstream (owner question shared with `workflow-engine/index.mjs`). | Low |
| 2 | 147-154 | B5 | `engineDriverSources` → `serviceInputs` → `captureInputs` → `prepareEngineModule` hash ceremony. It also lists sibling fixture files by hand as "sources". | Delete. Call `collectWorkflowWakeupTraces()` and `checkTraces({model, traces})`. | Low |
| 3 | 156-164 | B5/A8 | Assumption and obligation prose duplicated in the README. | Keep once. | None |
| 4 | 95, 114, 121 | T8 | `await new Promise(resolve => setImmediate(resolve))` single turns before observation. Fine with the controlled clock (they are not sleeps). | Use `settle()` from support for consistency. | None |
| 5 | 12, 17 | — | Reads private upstream fields. A pin bump that renames them fails the harness. That is acceptable under an upstream-bump lane. | Keep. | Low |
| 6 | test | T9/B5 | The owning test runs the harness in a child process and asserts exact counts. | Call it in-process and assert `passed` plus key actions. | None |

## Proposed end state
About 140 lines. The scenario list stays as is and the runner is a few lines with no source hashing. It runs only in the upstream lane. The owner decides between keeping it here and moving it to `vendor/eliza` upstream together with `workflow-engine/` and `registration.mjs`.
