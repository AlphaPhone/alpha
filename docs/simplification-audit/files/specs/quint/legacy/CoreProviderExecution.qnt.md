# specs/quint/legacy/CoreProviderExecution.qnt
- Lines: 141 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream ProviderExecution coalescing: last caller retires execution, stop settles signalless caller, abort only when unwanted; coalesced and one-off configurations; 4 runs. Duplicates: none. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/ProviderExecution.tla), `legacy/core/check-provider-execution-refinement.mjs` (imports `loadProviderStateComposer` from `refinement/services/core-runtime/module.mjs`; current code), `test/quint-provider-execution-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Already depends on the services harness loader; it is a services model in all but location. | Relocate. | Low |

## Proposed end state
Move to `specs/quint/services/CoreProviderExecution.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
