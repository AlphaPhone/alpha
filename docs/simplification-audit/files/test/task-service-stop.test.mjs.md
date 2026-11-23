# test/task-service-stop.test.mjs
- Lines: 164 | Kind: unit of the upstream `TaskService` (as patched by `scripts/core-state-patch.ts`) with a stub runtime | Verdict: DELETE (T4/T5)
- Covers: `stop()` refuses manual execution, drains admitted reads and work, suppresses queued due reads, concurrent owners keep the blocking marker, nonblocking overlap counts owners, blocking repeats exclude a second manual run. Duplicates: the stop/drain behaviour is upstream's (`TASK_SERVICE_STOPPED` is defined in `vendor/eliza/packages/core/src/services/task.ts`, tested by `vendor/eliza/packages/core/test/task-scheduler-model.test.ts`); the scenarios are replayed with real PGlite in `specs/quint/refinement/services/task-service/index.mjs` ("stop waits for the undelivered read" l.95-101, two-owner matrix l.104-117, "blocking repeat excludes a second manual owner" l.119-124, "nonblocking scheduler overlaps manual owner" l.125+). Callers/importers: `npm test`. Research mis-filed it as "tests a scripts/ module"; it imports `core-state-patch.ts` only as the build plugin.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-164 | T4 | Every scenario has a model-checked twin in the Quint harness on real SQL. | Delete. | low |
| 2 | 19-22 | T3 | Hand-built runtime stub (`getTask`, `getTasks`, logger, settings). | Goes with the file. | none |
| 3 | 26-30, 139-154 | T5 | "stopped timer mode retired" and "one-shot reread held across stop" are upstream behaviours. | Check the Quint harness covers the one-shot reread; if not, add a scenario there rather than keep this file. | low |
| 4 | 6-11 | C5 | Its own esbuild loader duplicates `loadTaskService` in the harness `module.mjs`. | Goes with the file. | none |

## Proposed end state
Deleted. TaskService stop/ownership behaviour stays covered by the live Quint refinement (real module, real PGlite) and
upstream's suite. Owner check: confirm the one-shot reread case (l.139-154) is in the harness; add it there if missing.
