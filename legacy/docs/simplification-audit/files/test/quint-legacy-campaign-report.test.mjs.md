# test/quint-legacy-campaign-report.test.mjs
- Lines: 18 | Kind: tooling test of `collectLegacyCampaigns` in `specs/quint/refinement/legacy/index.mjs` (loaded with `tsImport`) | Verdict: DELETE
- Covers: the legacy campaign collector keeps receipts on both sides of a failed replay. Duplicates: the same collect-and-continue logic exists in the application/services/native index runners. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-18 | T5, P6 | Tests a helper of the legacy family that D11 retires. | Delete with `specs/quint/refinement/legacy/`. | None |
| 2 | — | — | If the manifest runner keeps a shared "collect failures, keep going" helper, test it once in `test/quint/tooling.test.mjs`. | Optional. | None |

## Proposed end state
Deleted with the legacy refinement directory.
