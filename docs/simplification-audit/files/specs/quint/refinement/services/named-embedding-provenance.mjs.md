# specs/quint/refinement/services/named-embedding-provenance.mjs
- Lines: 345 | Kind: Quint refinement harness (real `AgentRuntime`, `ModelDispatch`, PGlite SQL adapter from patched upstream via `embedding-store-pglite.mjs`) | Verdict: KEEP (owner question: upstream-patch model)
- Covers: `NamedEmbeddingProvenance.qnt` — named embedding-space activation fences vector writes/searches, unmarked vs. marked vectors, width/value refusals, CAS re-check of source text after a winning edit, held writes across activation, delayed resize refused once a named width is active, SQL rollback on refusal, document-fragment lexical fallback; 8 traces. Duplicates: `test/quint-named-embedding-provenance.test.mjs` tests 2-3 are hand-written integration probes (activation publication window; ExperienceService reload) — different behaviour, not duplicates; `embedding-store-identity.mjs` shares the loader. Callers/importers: `test/quint-named-embedding-provenance.test.mjs`, `services/index.mjs:44,90`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Models upstream `@elizaos/core` and `plugin-sql` behaviour as patched by `scripts/core-state-patch.ts` (named embedding targets). Live in the product agent, but the code is upstream + local patch. | Keep while the patch is local; move upstream with the patch (D14 follow-up). | low |
| 2 | 96 | A1? | Observation state `'legacy'` for an unlabelled store and scenario `unmarked-width-only-store-remains-compatible`. This is the *current* unlabelled (no named space) mode, not pre-rename data; not an A1 legacy reader. | Keep; consider renaming the observed value to `unlabelled` together with the model (model text change, low value). | none |
| 3 | 43-54 | — | `holdManager` monkey-patches `adapter.manager.initialize` once to hold a real admission; a clean seam. | Keep. | none |
| 4 | 333-344 | B5 | Assumption/obligation prose. | Header comment. | none |
| 5 | 6 | C3 | Imports `deferred` from `./support.mjs` (good, shared). | — | none |

## Proposed end state
Unchanged campaign (~320 lines after dropping prose), one wrapper test. Revisit when the core-state embedding patch lands upstream.
