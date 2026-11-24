# test/quint-core-task-service-refinement.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper over a historical model (`checkTaskServiceRefinement` from `specs/quint/legacy/core/check-task-service-refinement.mjs`) | Verdict: DELETE
- Covers: original TaskService profiles vs claims, timers and wake revisions; pins one mismatch. Duplicates: `services/TaskServiceLifecycle` (task-service campaign in the services index), twin model. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream core only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-task-service-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreTaskService and three variants).
