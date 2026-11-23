# scripts/ci/required-result.ts
- Lines: 28 | Kind: CI script (aggregate needed-job results into one required check) | Verdict: KEEP
- Covers: each argument `name=result[:selected]`; a selected job must succeed, an unselected one may be skipped; prints a table and exits 1 otherwise. Duplicates: none. Callers/importers: `.github/workflows/android.yml:171`, `browser.yml:258`; `test/ci-required-checks.test.mjs:8-19` (unit test of the function).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Small, clear, and the mechanism that lets path-scoped lanes skip while the three required check names stay stable. It is central to the simpler CI (P1). | Keep; every new lane workflow ends in one `result` job calling it. | — |
| 2 | test | T3 | `ci-required-checks.test.mjs` first case is a unit test; the remaining cases are workflow-text assertions (T1). | Keep only the `requiredResult` case if any tooling test survives (it gates merges); delete the YAML-text cases. | Low. |

## Proposed end state
Unchanged; reused by every path-scoped workflow's aggregate job.
