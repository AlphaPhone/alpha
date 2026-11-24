# specs/quint/legacy/CoreServiceLifecycleDesign.qnt
- Lines: 235 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: DELETE
- Covers: upstream ServiceLifecycle *design*: one live instance per class, stop at most once, no late publish, status consistent; liveness and siblings configurations; 3 runs. Duplicates: `services/CoreServiceLifecycle.qnt` (sources current `runtime/service-lifecycle.ts`, `retirement.ts`). Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/ServiceLifecycle.tla), `legacy/core/check-service-lifecycle-refinement.mjs` (runs current runtime via `loadTaskService`), `test/quint-core-service-lifecycle-design-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | T4 | Name says Design; the services twin is the current model of the same unit (research §2.9 pair). | Delete after carrying any missing scenario. | Low |

## Proposed end state
Delete model, entries, `legacy/core/check-service-lifecycle-refinement.mjs`, its test. Cases worth checking in `services/CoreServiceLifecycle` first: `lateStartIsStoppedOnceTest`, `unloadLastClassClearsStatusTest`, `failedClassLeavesSiblingAvailableTest`; add the missing ones to the services replay.
