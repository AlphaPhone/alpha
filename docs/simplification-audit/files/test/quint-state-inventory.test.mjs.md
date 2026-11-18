# test/quint-state-inventory.test.mjs
- Lines: 77 | Kind: tooling (tests `specs/quint/refinement/model-state.mjs`) | Verdict: KEEP, MERGE into `test/quint/tooling.test.mjs`
- Covers: Quint state inventory (aliases, nested records, imported instances, overrides) and trace action coverage that the refinement receipts use to report unobserved fields. Duplicates: none Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job. `model-state.mjs` is imported by `refinement/application/index.mjs` and `refinement/native/index.mjs`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-77 | keep | Temp `.qnt` files, real parser code; small and fast. | Move into the tooling file. If the runner stops reporting unobserved fields, delete with `model-state.mjs`. | Low |
| 2 | 13-77 | D8 | Minified style. | Reformat on move. | Low |

## Proposed end state
- Six cases in `test/quint/tooling.test.mjs`.
