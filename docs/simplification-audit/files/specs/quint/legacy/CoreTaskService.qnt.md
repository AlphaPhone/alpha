# specs/quint/legacy/CoreTaskService.qnt
- Lines: 258 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream TaskService over 4 configurations (daemon/local x oneshot/repeat): one-shot at most once and deleted after run, blocking no overlap, no lost wake, paused not selected; 5 runs. Duplicates: partial: `services/TaskServiceLifecycle.qnt`; `core-state-patch.ts` CORE_STATE_TARGET is `services/task.ts`. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/TaskService.tla), `legacy/core/check-task-service-refinement.mjs` (runs the patched `services/task.ts` via `loadTaskService`; lines 18 and 162 hash the upstream TLA and `task-scheduler-model.test.ts`), `test/quint-core-task-service-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Covers product-patched task.ts (CORE_STATE_TARGET). | Keep; relocate. | Medium if deleted |
| 3 | 18, 162 | T10 | Text hashes of upstream TLA and an upstream test file. | Drop. | Low |
| 4 | — | T4 | Overlap with TaskServiceLifecycle. | Compare scenario lists; merge later. | Low |

## Proposed end state
Move to `specs/quint/services/CoreTaskService.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
