# specs/quint/legacy/core/task-service-refinement.md
- Lines: 14 | Kind: prose note for a legacy refinement campaign (historical CoreTaskService profiles vs current TaskService) | Verdict: DELETE
- Covers: describes what `legacy/core/check-task-service-refinement.mjs` observes for four `CoreTaskService` profiles and records a known mismatch (pause flag at `maxFailures=1`, rejected one-shot). Duplicates: the live `specs/quint/refinement/services/task-service/` harness + `services/TaskServiceLifecycle.qnt` model the current TaskService (ci-and-formal §2.9 twin list). Callers/importers: none. `git grep "task-service-refinement.md"` (excluding the audit folder) returns nothing; README.md in this folder does not link it. The `.mjs` of the same stem is imported by `specs/quint/refinement/legacy/index.mjs:24` and `test/quint-core-task-service-refinement.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / P6 | Orphan document about a historical model of upstream code; nothing links or reads it. | Delete with `legacy/`. | None. |
| 2 | 13 | — | Records an accepted model/source divergence (current runtime pauses a repeat task in the failure write; original model does not). If the live `TaskServiceLifecycle` model does not already state this behaviour, it is a fact worth one sentence there. | Check the live model's comments before deleting; carry the sentence if missing. | Low. |

## Proposed end state
Deleted with `specs/quint/legacy/**`, `legacy/core/check-task-service-refinement.mjs`, its index row and
`test/quint-core-task-service-refinement.test.mjs`. Current TaskService behaviour stays covered by the live
`services/task-service` harness.
