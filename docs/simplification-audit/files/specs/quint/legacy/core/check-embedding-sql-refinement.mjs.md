# specs/quint/legacy/core/check-embedding-sql-refinement.mjs
- Lines: 181 | Kind: Quint refinement harness (legacy, executes HISTORICAL upstream fragments in PGlite) | Verdict: DELETE
- Covers: 2 schedules of historical `RuntimeEmbeddings` + `PgliteDatabaseAdapter` (5 historical fragments: `runtime/embeddings.ts`, `embedding-vector-space.ts`, plugin-sql `base.ts`, `embedding-space.ts`, `pglite/adapter.ts`) against `legacy/CoreEmbeddingDimension.qnt`, deliberately reproducing a known historical provenance counterexample. Duplicates: `specs/quint/refinement/services/named-embedding-provenance.mjs` (live `NamedEmbeddingProvenance`) runs the current, product-patched source (`EMBEDDING_STATE_TARGET`, `NAMED_EMBEDDING_TARGETS` in `scripts/core-state-patch.ts`) and checks the refusal. Callers/importers: `specs/quint/refinement/legacy/index.mjs:13`, `test/quint-embedding-sql-refinement.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-18, 160-164 | P6 | Executes code the product no longer ships (historical revision) to show an old bug still exists in old code. | Delete. | None: current behaviour covered by NamedEmbeddingProvenance. |
| 2 | 32-44 | — | Hand-written partial schema (memories/embeddings DDL) instead of real plugin-sql migrations; drifts from the real schema. | Gone. | None. |
| 3 | 172-178 | B5 | Narrative assumptions. | Gone. | None. |

## Proposed end state
Delete harness, `legacy/CoreEmbeddingDimension.qnt` + manifest entry, the index row, `test/quint-embedding-sql-refinement.test.mjs`. Keep `named-embedding-provenance.mjs` as the only embedding-space model.
