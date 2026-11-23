# test/quint-core-interactive-task-traces.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper over a historical model (`checkInteractiveTaskTraces` from `specs/quint/legacy/core/check-interactive-task-traces.mjs`) | Verdict: DELETE
- Covers: the original interactive-task model matches selected traces from upstream reducer tests (`vendor/eliza/packages/core/test/interactive-task-*.test.ts`) and pins one known mismatch. Duplicates: none in this repo; the behaviour is upstream (`vendor/eliza`) code. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream test files only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |
| 3 | 11-12 | B5 | Asserts a mismatch exists (`passed === false`). | Gone. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-interactive-task-traces.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreInteractiveTask).
