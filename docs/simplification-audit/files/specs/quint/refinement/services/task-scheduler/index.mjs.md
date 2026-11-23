# specs/quint/refinement/services/task-scheduler/index.mjs
- Lines: 133 | Kind: Quint refinement harness over a historical model | Verdict: DELETE (P6, with `specs/quint/legacy`)
- Covers: `CoreTaskScheduler` / `CoreTaskSchedulerRestart` read from `specs/quint/legacy/CoreTaskScheduler.qnt` (a translation of an archived upstream TLA+ design) against the upstream scheduler and TaskService; 10 schedules. Duplicates: `runtime.mjs` (TaskSchedulerRuntime, live services model) replays the same source with a superset of behaviours: adapter replacement during a held query, stop/restart detaching an old run, busy-service retention, current vs stale query refusal. Callers/importers: `specs/quint/refinement/legacy/index.mjs:25`, `test/quint-task-scheduler-refinement.test.mjs` (verdict DELETE in its own report).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P6 | Reads a model under `specs/quint/legacy/`; the research names this line as one of the three blockers for retiring `legacy`. | Delete this file rather than moving `CoreTaskScheduler.qnt` into `services/`. | Low |
| 2 | 43-110 | T4 | Scenarios worth checking against `runtime.mjs` before deletion: "same adapter start preserves generation" (line 44) and "stopped service cannot register while capacity remains" (line 87). The runtime fixture does not have an explicit same-adapter restart or a stopped-instance re-register step. | Carry those two steps into `runtime.mjs` scenarios if `TaskSchedulerRuntime` actions allow (`startAdapter` same id, `registerService` reject); otherwise accept the loss. | Low |
| 3 | 112-131 | B5 | Assumption/obligation prose for the receipt. | Gone. | None |

## Proposed end state
File deleted together with `fixture.mjs`, `specs/quint/legacy/CoreTaskScheduler.qnt`, its legacy index entry and
`test/quint-task-scheduler-refinement.test.mjs`. Upstream scheduler coverage (if kept) is `runtime.mjs` only.
