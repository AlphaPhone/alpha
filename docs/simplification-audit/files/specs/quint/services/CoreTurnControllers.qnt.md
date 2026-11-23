# specs/quint/services/CoreTurnControllers.qnt
- Lines: 129 | Kind: Quint model, live (9 tests, `safety` only); **upstream-only** sources | Verdict: KEEP (upstream-pin lane); harness must stop depending on `specs/quint/legacy`
- Covers: upstream core per-runtime turn ownership, cancellation and asynchronous-context lookup (active results, owned reasons, owned signal, closed turns aborted). Sources: `vendor/eliza/packages/core/src/runtime/{turn-controller.ts, turn-aborted-error.ts}`, `upstream.lock.json` (all exist). Duplicates: none. Callers: harness `refinement/services/core-runtime/turns.mjs` (224 lines), loaded through `core-runtime/module.mjs:loadCoreRuntime` (an esbuild bundle of the real vendor files with core-state patch transforms, every input hashed). Wrapper `test/quint-core-turns.test.mjs`; aggregate `refinement/services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness loader | P6 | `core-runtime/module.mjs:9,49` calls `materializeHistoricalFormalSources` from `specs/quint/legacy/core/formal-source-inventory.mjs`. Every run of this current harness reads `legacy/core/source-inventory.json`, needs the historical upstream revision that `quint:prepare-history` fetches over the network, and adds those files to the receipt. The current model has no use for historical sources. | Remove the `history` call from `module.mjs`. Without it, deleting `legacy/` and `quint:prepare-history` no longer breaks the four core-runtime harnesses. | high (ordering; also removes a network fetch) |
| 2 | — | §2.9 | Only an upstream pin bump can change the behaviour, yet it runs on every PR inside `npm test`. | Select it only on `upstream.lock.json`/vendor-pointer/`scripts/core-state-patch.ts` changes, or move it upstream (owner Q4). | low |
| 3 | harness loader | B5 | `module.mjs` asserts "Core source changed during compilation" and "Core source input changed before capture" (mid-run re-hash). | Drop it with the §2.8 ceremony cleanup. | low |
| 4 | whole | — | The model is small and readable, and its `safety` conjunction is clear. | No change. | none |

## Proposed end state
Model unchanged, in an upstream-pin lane, run by its existing wrapper. The loader bundles only current vendor sources, with no historical inventory and no re-hash. Any historical twin in `specs/quint/legacy` is deleted with that family.
