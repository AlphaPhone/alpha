# specs/quint/services/NamedEmbeddingProvenance.qnt
- Lines: 196 | Kind: Quint model (services family, live: `specs/quint/services/manifest.json`, 7 tests, no witnesses) | Verdict: KEEP; gate on upstream change; upstream follow-up
- Covers: upstream `BaseDrizzleAdapter` named embedding-space fence: a vector write held across PGlite initialisation or named activation cannot label a row with the new space unless the provider marker is exact, and a delayed resize cannot overwrite the pinned width. Models only `vendor/eliza/**` (plugin-sql `base.ts`, `embedding-space.ts`, `pglite/adapter.ts`, core `embedding-vector-space.ts`, `runtime/embeddings.ts`, `model-dispatch.ts`, `data-mutations.ts`, agent `conversation-routes.ts`, assistant experience `service.ts`); all exist. Duplicates: `EmbeddingStoreIdentity.qnt` (same store, unlabelled probe) and `legacy/core` `CoreEmbeddingDimension` + `legacy/core/check-embedding-sql-refinement.mjs` (historical translation of the pre-fence bug). Callers/importers: manifest; harness `refinement/services/named-embedding-provenance.mjs` (runs real PGlite + drizzle through `embedding-store-pglite.mjs`; binding style: imports and runs upstream code, no text slicing); run by `test/quint-named-embedding-provenance.test.mjs` and again by the services aggregate `refinement/services/index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3, sources | P6 / ci §2.9 | Every source is upstream. The model can only change verdict when `upstream.lock.json` moves, yet it runs (with a real PGlite campaign) on every PR that touches `scripts/**` or `specs/**`. | Run only when `upstream.lock.json` or the harness changes; list as an upstream follow-up (D14): the fence and its model belong in `vendor/eliza` plugin-sql. | Low |
| 2 | 22, 27-32 | naming | `space: "legacy"` is upstream's name for the unnamed space, not an A1 legacy reader. Keep; no deletion implied. | None (note for reviewers grepping `legacy`). | — |
| 3 | header | A8 | Header is fine; the README section "Named embedding provenance" narrates revision `5a672102dd` / pin `99b49439ce9` history. | Trim the README (see README report). | — |
| 4 | — | T4 | Wrapper test + aggregate both run the PGlite campaign. | One manifest-driven runner. | Low |

## Proposed end state
Model unchanged. Its PGlite refinement runs once, only on upstream pin or harness changes. Upstream follow-up: move the model and harness next to `plugin-sql` and drop the consumer copy plus the legacy `CoreEmbeddingDimension` translation once that lands.
