# specs/quint/refinement/services/task-scheduler/runtime-fixture.mjs
- Lines: 221 | Kind: harness fixture (controlled timer/DB/worker/process ports around the real upstream scheduler) | Verdict: KEEP while `TaskSchedulerRuntime` stays (SIMPLIFY)
- Covers: two agents, three TaskService instances, two adapters, process-task registry; observes exact source state via `observeScheduler()` and projects 24 model fields. Duplicates: superset of `fixture.mjs` (DELETE). Callers/importers: `runtime.mjs:5`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | C3/P6 | Imports `until` from `fixture.mjs`, which is deleted with the legacy campaign. | Import from `specs/quint/refinement/support.mjs`. | None |
| 2 | 20-24 | C3 | Local `deferred` twin. | Shared helper. | None |
| 3 | 75-88 | – | Wraps the real `runTick` to attribute calls to ticks; no product logic replaced. | Keep. | – |
| 4 | 194-219 | B1-ish | `close()` loops up to 10 turns resolving workers; acceptable teardown. | Keep. | – |

## Proposed end state
Same fixture with shared `until`/`deferred`; deleted together with `runtime.mjs` if the owner moves the upstream-only
scheduler model upstream.
