# test/quint-fact-write-dedupe-refinement.test.mjs
- Lines: 16 | Kind: Quint refinement wrapper over a historical model (`checkFactWriteDedupeRefinement` from `specs/quint/legacy/core/check-fact-write-dedupe-refinement.mjs`) | Verdict: DELETE
- Covers: real `AgentRuntime` + PGlite refine two fact-write dedupe profiles; pins pool boundary numbers (119/120). Duplicates: `quint-fact-write-scope.test.mjs` replays current fact writes (services index). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream core only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |
| 3 | 11-14 | B5 | Pins exact `sourceBoundaries` object. | Gone. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-fact-write-dedupe-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreFactWriteDedupe, …Prefilled).
