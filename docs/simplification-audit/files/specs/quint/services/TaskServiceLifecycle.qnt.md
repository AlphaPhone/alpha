# specs/quint/services/TaskServiceLifecycle.qnt
- Lines: 159 | Kind: Quint model (live; upstream-only sources) | Verdict: KEEP (upstream-pin lane); delete legacy twin `legacy/CoreTaskService`; drop the harness's import from `specs/quint/legacy`
- Covers: upstream core `TaskService` lifecycle: counted execution ownership across manual and timer invocations, stop/await-stop quiescence, restart generations, orphan grace/quarantine/heal of repeating tasks. Duplicates: `legacy/CoreTaskService` (research §2.9); stop/timer overlap with `CoreServiceLifecycle.qnt`. Callers/importers: `quint:check`; `refinement/services/task-service/index.mjs` (aggregate `services/index.mjs:38` and `test/quint-task-service-refinement.test.mjs`); `test/trigger-cursor-isolation.test.mjs` imports its loader `task-service/module.mjs`; listed in `legacy/manifest.json` and `legacy/core/lifecycle-metadata.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.9 / P1 | Sources are `vendor/eliza/packages/core/src/{services/task.ts,services/task-scheduler.ts,runtime.ts}`, `plugins/plugin-sql/...` and `scripts/core-state-patch.ts`. No Alpha product code. | Upstream-pin lane only (`upstream.lock.json`, vendor pointer, `core-state-patch.ts`); upstream follow-up. | Low |
| 2 | harness `task-service/module.mjs:10,51` | P6 | Loader imports `materializeHistoricalFormalSources` from `specs/quint/legacy/core/formal-source-inventory.mjs` and adds historical sources to its bound inputs, so this live model needs the legacy tree (and its network fetch). | Remove that import and the `history.sources`; the live harness needs only the vendor bundle. Precondition for retiring `specs/quint/legacy`. | Low |
| 3 | harness | B5 | Before/after hashing of every compiled file and PGlite resource; test asserts `traces === 13`, `checkpoints === 85`, `sourceCapture` string. | Drop rehash and exact counts. | Low |
| 4 | test | T4 | Runs in aggregate and in its own test (300 s timeout, boots PGlite). `test/trigger-cursor-isolation.test.mjs` boots PGlite a third time only to prove globals were restored. | One execution in the upstream-pin lane; delete the isolation test's PGlite step (T5). | Low |
| 5 | 124 | — | `TypeOK` bounds `generation` 1..2 and `calls` 0..3; consistent with `restart` guard. | None. | — |

## Proposed end state
Model unchanged; harness bundles the real `TaskService` + SQL helpers without any `legacy/` import, receipts or count
pins; runs only when the upstream pin or core-state patch changes. `legacy/CoreTaskService` deleted.
