# test/quint-source-bundle-capture.test.mjs
- Lines: 29 | Kind: tooling (tests `specs/quint/refinement/services/support.mjs` `sourceModule`) | Verdict: KEEP, MERGE into `test/quint/tooling.test.mjs`
- Covers: `sourceModule` captures the dependency graph without executing source, and refuses a dependency that changes after capture. Duplicates: none Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-29 | keep | `sourceModule` is the import-based loader that the T10 ports should converge on; its no-execute-before-capture property matters. | Move both cases into the tooling file. | Low |
| 2 | 8-29 | D8 | Minified one-line statements. | Reformat when moved. | Low |

## Proposed end state
- Two cases in `test/quint/tooling.test.mjs`.
