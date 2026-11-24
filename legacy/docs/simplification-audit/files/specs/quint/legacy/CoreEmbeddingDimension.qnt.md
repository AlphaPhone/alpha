# specs/quint/legacy/CoreEmbeddingDimension.qnt
- Lines: 130 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: DELETE
- Covers: upstream EmbeddingDimension design: pin refuses different provider, unpinned write re-tag, wrong width dropped; 3 runs. Duplicates: `services/EmbeddingStoreIdentity.qnt` and `services/NamedEmbeddingProvenance.qnt` refine current `runtime/embeddings.ts`, plugin-sql `base.ts`, `embedding-space.ts`. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/EmbeddingDimension.tla), `legacy/core/check-embedding-sql-refinement.mjs` (lines 13, 153, 175-178: runs *historical* RuntimeEmbeddings and SQL adapter fragments from 4787d51a; deliberately preserves a known historical provenance counterexample), `test/quint-embedding-sql-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | P6 | Evidence about superseded upstream code that the product no longer ships; requires the history fetch. | Delete. | None |
| 3 | — | T4 | Current embedding identity/provenance is covered by the two services models. | Rely on them. | Low |

## Proposed end state
Delete model, manifest/inventory entries, `legacy/core/check-embedding-sql-refinement.mjs`, `test/quint-embedding-sql-refinement.test.mjs`.
