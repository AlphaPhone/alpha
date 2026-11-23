# test/aosp-cuttlefish.test.mjs
- Lines: 38 | Kind: tooling (pure option validators + `reviewedSourceOverrides` on a temp lock file) | Verdict: MERGE into `test/tooling/aosp.test.ts`
- Covers: `--target cuttlefish` option rules, source-override admission bound to the source-lock hash, and named SystemUI patch admission. Duplicates: `test/aosp-staging-patches.test.mjs` test 2 is the same shape for `stagingBuildPatches`; `test/aosp-release-signing.test.mjs` test 3 covers the Pixel side of the same option parsing. Callers/importers: `npm test`; imports `scripts/aosp-cuttlefish.ts`, `scripts/stage-aosp.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-16, 28-29 | - | Dynamic `await import('node:fs')` etc. inside the test body for modules that could be top-level imports. | Static imports when merging. | none |
| 2 | 28-38 | C5 | `stagingSystemuiPatches` and `stagingBuildPatches` (in aosp-staging-patches) are near-twin admission functions tested twice in two files. | One table-driven test over both in the merged file. | none |
| 3 | 37 | T1 | Asserts a vendor manifest field is a 64-char hash (upstream data shape). | Drop that line. | none |

## Proposed end state
Three short cases in `test/tooling/aosp.test.ts` ("stage options"): target/option matrix (Cuttlefish and Pixel together),
source-override lock binding, and a single table for named SystemUI/build patch admission.
