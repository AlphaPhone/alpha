# specs/quint/refinement/services/workflow-scheduler/registration.mjs
- Lines: 209 | Kind: Quint refinement harness (integration: upstream `EmbeddedWorkflowService` lifecycle methods on PGlite with a controlled task-store port) | Verdict: KEEP (upstream-only; lane-gate on `upstream.lock.json`), SIMPLIFY
- Covers: 14 schedules of `WorkflowScheduleTasks.qnt`: typed activation commits before task creation, and pause removes the task. Restart repairs a creation failure before or after the write. A held old activation cannot survive a concurrent pause, and a stale host creation does not delete the newer activation's task. A completed cleanup marker can precede a late task whose retirement fails, and startup removes it. Pause keeps non-schedule triggers, removal cleans every trigger with an idempotent receipt, and cleanup failure keeps removal pending so restore is refused until cleanup is confirmed. Typed startup reconstructs a missing task, generic startup does not invent one, and an invalid schedule or stale review is rejected. Duplicates: none in repo. Callers/importers: `specs/quint/refinement/services/index.mjs:30` (aggregate) and `test/quint-workflow-tasks-refinement.test.mjs` (child process, exact 14 traces / 63 checkpoints).

Model is live (manifest `WorkflowScheduleTasks`, sources `vendor/eliza/plugins/plugin-workflow/src/services/embedded-workflow-service.ts`, `vendor/eliza/packages/core/src/utils/{string-to-uuid,uuid}.ts` and `types/trigger.ts`, all present). Upstream-only.

Product text read: none. The harness depends on the upstream SQL table `workflow.lifecycle_mutations` (column `expected_version_id`, `operation`), the metadata keys `elizaPhoneWorkflowSpec`, `elizaPhoneRemovedAt`, `elizaPhoneTriggerCleanup`, `reviewedVersionId`/`hostedVersionId`, the dedupe key `workflow-schedule:<id>` and the task name `TRIGGER_DISPATCH`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6/§2.9 | Upstream-only model runs on every PR. | Upstream lane only, or move it upstream (owner question). | Low |
| 2 | 192-197 | B5 | Same hash/provenance ceremony as the wake-up harness. | Delete it and keep only `collectWorkflowTaskTraces` plus `checkTraces`. | Low |
| 3 | 199-208 | B5/A8 | Prose assumptions and obligations duplicated in the README. | Keep once. | None |
| 4 | 9, 51-56 | — | `attempt` and `settled` are small local helpers used only here. | Keep (they do not duplicate support). | — |
| 5 | 38-43 | — | For generic workflows the projection drops `s.tasks`/`s.pendingVersion` and adds `taskCount`. This is a documented refinement gap. | Keep. The README already explains it. | — |
| 6 | 28 | — | Raw SQL `SELECT expected_version_id FROM workflow.lifecycle_mutations` reads an upstream table by name. | Accept (an upstream lane catches renames). | Low |
| 7 | test | T9/B5 | Child-process test with exact counts. | Call it in-process and assert `passed`. | None |

## Proposed end state
About 185 lines: the 14 scenarios and the projection, with a short runner and no hash ceremony. It runs in the upstream lane, or moves upstream with `workflow-engine/` and `workflow-scheduler/` as one package of upstream workflow-engine models (`WorkflowEngineAdmission`, `WorkflowWakeups`, `WorkflowScheduleTasks`).
