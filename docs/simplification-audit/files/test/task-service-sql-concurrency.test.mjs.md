# test/task-service-sql-concurrency.test.mjs
- Lines: 51 | Kind: integration (real patched `TaskService` bundled with `scripts/core-state-patch.ts` + real PGlite via `specs/quint/refinement/services/task-service/module.mjs`) | Verdict: DELETE (T4)
- Covers: two overlapping manual executions of one repeat task keep execution ownership until each completes or fails; switching to blocking suppresses a timer dispatch; `stop()` waits for the remaining owner; failure count recorded. Duplicates: `specs/quint/refinement/services/task-service/index.mjs:104-117` runs exactly this 2×2 matrix (`first of [1,2]` × `preserve|failure`, switch to blocking, `runDue`, stop waits for remaining owner) on the same real `TaskService` and PGlite, step-checked against the Quint model via `test/quint-task-service-refinement.test.mjs`; also `task-service-stop.test.mjs:73-114` (stub runtime). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-51 | T4 | Same scenario as the live Quint refinement harness, without the model check. | Delete. | none |
| 2 | 3-4 | — | Research filed this as a Quint replay; it is not one, it only borrows the harness loader. | n/a | none |
| 3 | — | cost | Each run bundles `task.ts` + plugin-sql test helpers with esbuild and boots PGlite (several seconds). | Saved by deletion. | none |

## Proposed end state
Deleted. Coverage stays in the Quint TaskService refinement (`specs/quint/refinement/services/task-service/index.mjs`),
which keeps passing at 100 %. If the owner wants the `failureCount` assertion (line 42), add it to that harness scenario.
