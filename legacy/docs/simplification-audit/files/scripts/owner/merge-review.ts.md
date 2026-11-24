# scripts/owner/merge-review.ts
- Lines: 221 | Kind: one-off owner review aid (#659: post-merge review of PR #657, merge `91c83b3c`) | Verdict: DELETE
- Covers: for one merge commit, package.json script changes, binary changes, forged-commit reachability, IOC/local marker matches in added lines, and whether `android/consumer-host.json` names three modules and ≥16 browser-surface helpers. Duplicates: marker logic overlaps `forged-branch-scan.ts` (`pathMarkers`/`contentMarkers`); local overloaded `git` wrapper (C3, one of 17). Callers/importers: only `test/owner-merge-review.test.mjs`. No npm script or workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 60-63, 219 | A7 | Hard-wired to one historical merge (`91c83b3c` default, module names and helper count from issue #659). It answers a question that was asked once. | Delete with `test/owner-merge-review.test.mjs`. | None |
| 2 | 55 | B4 | `MARKERS = markerPatterns(loadIocs())` runs at import time, so importing the module requires the IOC file. | n/a after delete. | — |
| 3 | 148-157 | C3 | Overloaded `git` wrapper. | n/a after delete. | — |

## Proposed end state
Deleted. The review it supported is finished; its result lives in the issue.
