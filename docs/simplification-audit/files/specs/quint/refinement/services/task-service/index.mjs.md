# specs/quint/refinement/services/task-service/index.mjs
- Lines: 171 | Kind: Quint refinement harness (real patched TaskService + real AgentRuntime + real PGlite SQL) | Verdict: KEEP (SIMPLIFY)
- Covers: `TaskServiceLifecycle.qnt` (live, `specs/quint/services/manifest.json:1652`): stop rejects new execution and drains held reads, two concurrent owners keep tracking through success/failure, blocking repeat excludes a second manual owner, non-blocking overlap, deletion during run, empty-queue disarm, query failure rearm, orphan grace/quarantine/healing, failed quarantine write. 13 schedules, 85 checkpoints. Duplicates: `test/task-service-sql-concurrency.test.mjs` repeats the 2×2 owner matrix of lines 104-117 (that test is DELETE in its report); legacy `CoreTaskService` campaign (`legacy/core/check-task-service-refinement.mjs`, DELETE). Run twice (`test/quint-task-service-refinement.test.mjs` and services aggregate `services/index.mjs:38`). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | C3 | Local `gate` (= `deferred`) and `until` (2000 turns) twins. | Shared `refinement/support.mjs`. | None |
| 2 | 77-170 | D8 | Scenario bodies are minified one-liners (`await create();const read=…;f.holdRead=read;…`). | Format; split long scenario lines. | None |
| 3 | 162-169 | B5 | Receipt assumptions/obligations prose. | Drop with receipts. | None |
| 4 | – | P6 | Upstream code (`vendor/eliza/packages/core/src/services/task.ts`), but TaskService does run inside Alpha's on-device agent runtime, so unlike the scheduler daemon this path is reachable. | Keep here unless the owner moves upstream-only models (Q4). | – |
| 5 | 104-117 | – | If the owner wants the `failureCount` check from `task-service-sql-concurrency.test.mjs:42`, the `'s.row.failures'` projection already compares it. | No change. | – |

## Proposed end state
Same 13 schedules, formatted, shared helpers, no receipt prose; one caller. Selected when the vendor pin,
`scripts/core-state-patch.ts` or the model changes.
