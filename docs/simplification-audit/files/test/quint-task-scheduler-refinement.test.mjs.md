# test/quint-task-scheduler-refinement.test.mjs
- Lines: 18 | Kind: Quint refinement wrapper (upstream code, legacy model) | Verdict: DELETE (with `specs/quint/legacy`; owner question)
- Covers: Upstream shared task daemon and TaskService refine CoreTaskScheduler and CoreTaskSchedulerRestart; the model lives at `specs/quint/legacy/CoreTaskScheduler.qnt`. Duplicates: `scripts/check-quint-refinement.ts` legacy family via `specs/quint/refinement/legacy/index.mjs`; the live services model TaskSchedulerRuntime (`quint-task-scheduler-runtime-refinement`) replays the same upstream scheduler. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; `specs/quint/refinement/services/task-scheduler/README.md`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-18 | P6 | The only live-harness consumer of a legacy model (ci-and-formal §6: "move CoreTaskScheduler.qnt into services/ or delete with its services twin"). | Delete with the legacy family; TaskSchedulerRuntime keeps scheduler coverage. If the owner keeps it, move the `.qnt` into `services/` and MERGE into the runner. | Medium |
| 2 | 6-18 | T5 | Replays `vendor/eliza/packages/core` scheduler code, not alphaphone code. | Upstream follow-up. | Low |

## Proposed end state
- Gone; TaskSchedulerRuntime remains.
