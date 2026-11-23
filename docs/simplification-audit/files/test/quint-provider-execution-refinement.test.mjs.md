# test/quint-provider-execution-refinement.test.mjs
- Lines: 19 | Kind: Quint refinement wrapper over a historical model (`runProviderExecutionRefinement` from `specs/quint/legacy/core/check-provider-execution-refinement.mjs`) | Verdict: DELETE
- Covers: current upstream provider composition refines keyed and one-off execution schedules (4+3 traces). Duplicates: none in this repo; the behaviour is upstream (`vendor/eliza`) code. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream provider execution only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |
| 3 | 12-17 | B5 | Literal list of 13 observed fields. | Gone. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-provider-execution-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreProviderExecution (two profiles)).
