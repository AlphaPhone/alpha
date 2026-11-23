# specs/quint/refinement/services/embedding-store-identity.mjs
- Lines: 216 | Kind: Quint refinement harness (real upstream `RuntimeEmbeddings` with controlled ports, plus the PGlite campaign from `embedding-store-pglite.mjs`) | Verdict: KEEP (upstream-only model; upstream-pin lane)
- Covers: embedding store identity/dimension pinning: model mismatch acceptance, provider custody, clear failure, cache read/write faults, fence after unconfirmed write, against `EmbeddingStoreIdentity.qnt`. Duplicates: `NamedEmbeddingProvenance` reuses the PGlite half. Callers: `services/index.mjs`, `test/quint-embedding-store-identity.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 / §2.9 | Manifest sources are only `vendor/eliza/**` (embeddings.ts, runtime.ts, model-dispatch.ts, plugin-sql base.ts). The local tie is `scripts/core-state-patch.ts` (`EMBEDDING_STATE_TARGET`, asserted at line 186-189). | Run on changes to `upstream.lock.json` or `scripts/core-state-patch.ts` only. | Low |
| 2 | 186-196 | B5 | Merges two `driverHashes` maps and asserts equality per file: input-provenance ceremony. | Drop with the receipt simplification. | Low |
| 3 | 205-214 | — | `obligations` text returned to the aggregate; only the aggregate consumes it. | Delete with the aggregate. | Low |
| 4 | 3 | C3 | Imports `deferred` from `./support.mjs` correctly (good); the PGlite sibling does too. | — | — |

## Proposed end state
Same seven unit-port scenarios plus the three PGlite scenarios, run only by its per-model test on the upstream-pin lane; no hash merging.
