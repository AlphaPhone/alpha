# test/quint-embedding-sql-refinement.test.mjs
- Lines: 12 | Kind: Quint refinement wrapper over a historical model (`checkEmbeddingSqlRefinement` from `specs/quint/legacy/core/check-embedding-sql-refinement.mjs`) | Verdict: DELETE
- Covers: historical PGlite fragments replay width rejection and a translated provenance counterexample (2 traces). Duplicates: `quint-embedding-store-identity` and `quint-named-embedding-provenance` replay the current embedding store. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream core only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-embedding-sql-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreEmbeddingDimension).
