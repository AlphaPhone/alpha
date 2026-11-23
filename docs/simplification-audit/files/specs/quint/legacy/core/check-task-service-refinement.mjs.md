# specs/quint/legacy/core/check-task-service-refinement.mjs
- Lines: 318 | Kind: Quint refinement harness (historical/legacy family; runs real upstream `TaskService` + `AgentRuntime` on PGlite) | Verdict: DELETE (with legacy retirement)
- Covers: 7 schedules across four profiles (daemon/local x oneshot/repeat) of upstream `TaskService` (stale daemon snapshot recheck, failed one-shot reread, blocking repeat ownership, atomic wake revision, pause/resume, local timer defer/disarm) against `specs/quint/legacy/CoreTaskService.qnt`, plus one expected mismatch (failure threshold auto-pause).
- Duplicates: live twin `specs/quint/services/TaskServiceLifecycle.qnt` with harness `specs/quint/refinement/services/task-service/index.mjs` (same loader `loadTaskService`); upstream `vendor/eliza/packages/core/test/task-scheduler-model.test.ts` (listed as a captured source, line 162). Host tests `test/task-service-sql-concurrency.test.mjs`, `test/task-service-stop.test.mjs` also drive the real TaskService.
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:24` and `test/quint-core-task-service-refinement.test.mjs:4` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-18, 159-164 | P6, T5 | Historical translation of retired upstream `TaskService.tla`; code under test is upstream. | Delete with model, manifest entry, index row, test wrapper and `task-service-refinement.md`. | Low; live twin remains. |
| 2 | 27-31, 115-118 | T8 | `until()` polls every 5 ms up to 10 s. | Moot after delete. | None |
| 3 | 310-317 | B5 | Expected-mismatch receipt written to `test-results/` and re-read. | Delete. | None |
| 4 | 1-318 | T4 | Before deleting, confirm the live `TaskServiceLifecycle` campaign covers: stale daemon snapshot rechecks after one-shot delete; failed reread keeps the row; wake revision survives stale completion. If any is missing, carry those scenarios into `refinement/services/task-service/index.mjs` (same fixture shape works there). | Owner/implementer check. | Medium if a scenario is unique. |

## Proposed end state
Deleted. Any of the three scenarios in finding 4 not already in the live task-service campaign are ported there against `TaskServiceLifecycle.qnt`; the auto-pause divergence is an upstream follow-up.
