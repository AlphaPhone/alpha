# test/ci-affected.test.mjs
- Lines: 83 | Kind: tooling integration (runs `scripts/ci/affected.ts` as the Actions entry point against a real git fixture repo and reads `GITHUB_OUTPUT`) | Verdict: KEEP; MERGE with `ci-required-checks.test.mjs` function cases into `test/tooling/ci-selection.test.ts`
- Covers: PR/push/dispatch lane selection from changed files, renames, deletes, missing history; browser spec/shard selection; docs that node tests read; Android files browser specs read. Duplicates: `ci-required-checks.test.mjs` lines 21-50 (`browserPlan`) test the same module. Callers/importers: `npm test` glob; `scripts/ci/affected.ts` gates every PR (`browser.yml`, `android.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-55 | - | Real integration of the gate that decides what CI runs: worth keeping, and the place to encode the P1 path matrix as it is rebuilt. | Keep; extend with one case per new lane when CI is restructured. | - |
| 2 | 69-83 | T1 | Regex-scans every browser spec for `'android/…'` string literals and asserts equality with `browserReadAndroid`. A self-maintaining list would be better: `affected.ts` should compute it the same way rather than hard-code it. | Make `affected.ts` derive `browserReadAndroid` by that scan; keep only the "selects browser+android" assertion. | Low |
| 3 | 57-67 | T4 | Calls `affected()` directly for cases the fixture run could cover. | Fold into the fixture test table. | None |

## Proposed end state
One CI-selection integration file: git-fixture runs of `affected.ts` (table of path -> lanes) plus `requiredResult`
cases from `ci-required-checks.test.mjs`. Grows with the path matrix of the simplified pipeline.
