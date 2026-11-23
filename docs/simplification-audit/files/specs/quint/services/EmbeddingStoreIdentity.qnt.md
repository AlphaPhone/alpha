# specs/quint/services/EmbeddingStoreIdentity.qnt
- Lines: 135 | Kind: Quint model, live (services manifest); models upstream-only code (`vendor/eliza/packages/core/src/runtime/embeddings.ts`, `runtime.ts`, `model-dispatch.ts`, `plugin-sql/src/base.ts`) as patched by Alpha's `scripts/core-state-patch.ts` | Verdict: KEEP (upstream-lock lane)
- Covers: embedding provider/model/width pinning: same-width swaps need acknowledgement, failed or ambiguous writes fence and disable generation, a resized column stays fenced until confirmed (7 runs, 4 invariants). Duplicates: none. Callers/importers: manifest; `refinement/services/embedding-store-identity.mjs` (imports `loadRuntimeEmbeddings` from `core-runtime/module.mjs` and the PGlite adapter, plus `EMBEDDING_STATE_TARGET` from `scripts/core-state-patch.ts`); `test/quint-embedding-store-identity.test.mjs`; aggregate `refinement/services/index.mjs`; `services/README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` | P6 / §2.9 | Every source is under `vendor/eliza`; the model can only change on a pin bump (or a change to `scripts/core-state-patch.ts`, which transforms these files) yet runs on every non-doc PR. | Path filter: `upstream.lock.json`, `patches/eliza/**`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts`, this model + harness. Upstream candidate (D14). | None |
| 2 | harness | T10 (ok) | Harness loads the real upstream modules through an esbuild loader that applies the reviewed patch bytes (`core-runtime/module.mjs:25-45`); no text slicing. | None. | — |
| 3 | test + index | T4, B5 | Runs twice; receipts hash inputs. | One runner. | None |

## Proposed end state
Unchanged model; runs only in the upstream-lock lane; listed among upstream follow-ups as a model to offer upstream with the core-state patch.
