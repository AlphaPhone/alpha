# .github/workflows/embedding-qualification-carrier.yml
- Lines: 66 | Kind: reusable workflow (upload a reviewed embedding qualification receipt) | Verdict: KEEP, SIMPLIFY (make it a standalone `workflow_dispatch` workflow)
- Covers: validates carrier inputs, sparse-checks out two qualification JSON files at a reviewed commit as data, validates them against the original component artifact (`scripts/ci/embedding-artifacts.py --check-carrier-inputs/--prepare-carrier`) and uploads them as an artifact whose id/digest a later `resident-android` build consumes. Duplicates: none. Callers/importers: only `resident-android.yml:53-62` (`operation: publish-qualification`); text read by `test/embedding-workflow-forwarding.test.mjs:58`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-19 | D10/D4 | Reached only through a dispatch of `resident-android.yml` with `operation=publish-qualification`, which multiplexes an unrelated upload flow into the 615-line build workflow. | Change `on:` to `workflow_dispatch` with the three inputs; delete the `operation` choice and `publish-qualification` job in `resident-android.yml`. Outputs become the run's artifact id (reported in the job summary). | Low; whoever runs the publication dispatches this file instead (document in README release notes). |
| 2 | 41-57 | KEEP | Data-only second checkout with `persist-credentials: false` and sparse paths; validation in a script. | Keep. | None. |
| 3 | whole | T1 | `test/embedding-workflow-forwarding.test.mjs` asserts input forwarding text between the two workflows. | Delete with #1 (the forwarding disappears). | None. |

## Proposed end state
A ~55-line dispatch-only workflow `embedding-qualification.yml` (same steps), independent of `resident-android.yml`.
