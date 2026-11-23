# specs/quint/legacy/CoreInteractiveTask.qnt
- Lines: 85 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model); PORT harness (drop historical materialization)
- Covers: upstream InteractiveTask reducer: one unresolved op, waiting iff dispatched, revocation final, unknown reconciled before resume; 3 runs. Duplicates: none. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/InteractiveTask.tla), `legacy/core/check-interactive-task-traces.mjs` (bundles current vendor; line 148 reads `historicalArtifacts` from the inventory) and `legacy/core/check-interactive-task-refinement.mjs` (lines 18-35: `materializeHistoricalFormalSources` for the graph/parser at the historical revision), `test/quint-core-interactive-task-traces.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | P6 | The refinement half needs the historical fetch; the traces half runs current code. | Keep the traces harness; delete `check-interactive-task-refinement.mjs` and the `historicalArtifacts` check. | Low |
| 3 | — | T10 | Traces harness also hashes `vendor/eliza/packages/core/test/interactive-task-conformance.test.ts` as text (line 134). | Drop the text hash; keep executed checks. | Low |

## Proposed end state
Move to `specs/quint/services/CoreInteractiveTask.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
