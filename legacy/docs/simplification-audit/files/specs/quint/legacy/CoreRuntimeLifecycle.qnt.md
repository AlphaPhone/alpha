# specs/quint/legacy/CoreRuntimeLifecycle.qnt
- Lines: 180 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream RuntimeLifecycle: single prepare/stop, turns aborted after stop, no live after stopped, eager start settles; 2 runs. Duplicates: partial: `services/CoreRuntimeShutdown`, `CoreRuntimeRetirement`. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/RuntimeLifecycle.tla), `legacy/core/check-runtime-lifecycle-refinement.mjs` (bundles current runtime; line 8 reads `vendor/eliza/packages/core/test/runtime-lifecycle-model.test.ts` as witness text), `test/quint-core-runtime-lifecycle-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | 8 | T10 / T5 | Uses an upstream test file as witness text. | Drop the text read; keep executed traces. | Low |
| 3 | — | T4 | Overlap with CoreRuntimeShutdown. | Compare; delete whichever is subsumed. | Low |

## Proposed end state
Move to `specs/quint/services/CoreRuntimeLifecycle.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
