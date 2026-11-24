# specs/quint/legacy/CoreTaskScheduler.qnt
- Lines: 183 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream TaskScheduler: no stale dispatch, one run tick per service, taken clears dirty, stopping old service preserves replacement; live and restart configurations; 3 runs. Duplicates: `services/TaskSchedulerRuntime.qnt` (sources task-scheduler.ts, task.ts, `scripts/core-state-patch.ts`). Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/TaskScheduler.tla), `specs/quint/refinement/services/task-scheduler/index.mjs:7` (a *services* harness: `modelPath = 'specs/quint/legacy/CoreTaskScheduler.qnt'`), also imported by `refinement/legacy/index.mjs`, services aggregate test, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | P6 | A live services harness depends on this file's legacy path; it blocks retiring the legacy folder (research §3). | Move to `specs/quint/services/CoreTaskScheduler.qnt`; update `modelPath` at index.mjs:7. | Low |
| 3 | — | T4 | Pair with TaskSchedulerRuntime. | Later: merge if TaskSchedulerRuntime's invariants subsume NoStaleDispatch/TakenClearsDirty. | Low |

## Proposed end state
Move to `specs/quint/services/CoreTaskScheduler.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Its harness already lives in `refinement/services/task-scheduler/`; only `modelPath` changes. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). This move is a prerequisite for deleting `specs/quint/legacy`.
