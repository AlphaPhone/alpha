# specs/quint/refinement/services/task-scheduler/runtime.mjs
- Lines: 164 | Kind: Quint refinement harness (executes real upstream source with controlled ports) | Verdict: KEEP (owner question: upstream-only, never enabled by Alpha)
- Covers: `TaskSchedulerRuntime.qnt` (live, `specs/quint/services/manifest.json:1793`) against upstream `task-scheduler.ts` + patched `task.ts`: grouped DB cohorts, scope violations, stale result drop, stop/restart detaching runs, worker failure reporting, process-task registry dispose/successor. 10 schedules. Duplicates: run twice (`test/quint-task-scheduler-runtime-refinement.test.mjs` and services aggregate `services/index.mjs:39`). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | – | P6 | Models upstream code only. `startTaskScheduler` has no caller anywhere in Alpha (`apps`, `android`, `scripts`) or elsewhere in `vendor/eliza` (grep: only its definition in `task-scheduler.ts`), so no Alpha build reaches the daemon path this model checks. | Owner decision (research §7 Q4): move upstream or delete model + harness + fixture + module. Until decided it stays passing (D11). | Low |
| 2 | 150-163 | B5 | Assumption/obligation strings for the receipt. | Drop with receipts. | None |
| 3 | 10-11 | B5 | Hashes its own files + model path into the receipt. | Drop. | None |
| 4 | 16-56 | – | Driver records model actions alongside each real call; clear mapping. | Keep. | – |

## Proposed end state
If kept: ~140 lines, one caller (manifest-driven runner), shared helpers, no receipt prose; selected only when
`vendor/eliza` pin, `scripts/core-state-patch.ts` or the model changes. If the owner agrees the daemon is out of
Alpha's scope: delete `runtime.mjs`, `runtime-fixture.mjs`, `module.mjs`, `README.md`, the model and its manifest row.
