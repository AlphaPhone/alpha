# test/quint-core-task-scheduling.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper over a historical model (`checkTaskSchedulingRefinement` from `specs/quint/legacy/core/check-task-scheduling-refinement.mjs`) | Verdict: DELETE
- Covers: current upstream semaphore and serial-queue utilities follow translated profiles (5+3+24 traces). Duplicates: none in this repo; the behaviour is upstream (`vendor/eliza`) code. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream scheduling utilities only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |
| 3 | — | P6 | `refinement/services/task-scheduler/index.mjs:7` reads `specs/quint/legacy/CoreTaskScheduler.qnt`: move that model to `services/` before deleting the legacy tree. | Cross-file action. | Medium |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-task-scheduling-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreSemaphore, CoreSemaphoreTwo, CoreSerialise).
