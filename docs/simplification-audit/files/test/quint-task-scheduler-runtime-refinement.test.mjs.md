# test/quint-task-scheduler-runtime-refinement.test.mjs
- Lines: 18 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Upstream task scheduler refines batched scope and independent process ownership (TaskSchedulerRuntime; `services/task-scheduler/runtime.mjs` over `vendor/eliza/packages/core/src/services/task.ts`). Duplicates: `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-17 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 10, 5 fields). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | whole | T5 | Exercises upstream code that the resident runtime ships. Keeping it is an owner decision (models of upstream code). | Keep as a runner row unless the owner moves it upstream. | Low |

## Proposed end state
- Runner row (owner may move upstream).
