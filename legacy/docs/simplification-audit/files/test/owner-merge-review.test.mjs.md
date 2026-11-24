# test/owner-merge-review.test.mjs
- Lines: 84 | Kind: tooling unit (pure parsers from `scripts/owner/merge-review.ts` on synthetic git output) | Verdict: DELETE (with `scripts/owner/merge-review.ts`)
- Covers: the #659 post-merge review aid: package.json script diff, binary changes from numstat, IOC/forged-marker matches in paths and added lines, and `consumer-host.json` descriptor coverage. Duplicates: marker detection overlaps `test/owner-incident-response.test.mjs:186-194` (`forged-branch-scan.ts` markers). Callers/importers: `npm test` glob only; the script has no caller besides this test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | A8 | Header narrates issue #659 and disclaims evidence. | Gone with the file. | None |
| 2 | 45 | B5 / T1 | Asserts the exact set of five forged commit prefixes (a constant in the script). | Delete. | None |
| 3 | 74-84 | T1-like | `descriptorCoverage` pins three upstream module names and a 16-helper count in `consumer-host.json` for one historical merge. | Delete. | Low |
| 4 | 7-72 | T3 | Pure-function unit tests of a one-off review aid. | Delete. | Low |

## Proposed end state
File deleted with `scripts/owner/merge-review.ts` (scripts report: DELETE, one-off review of PR #657). No product or release behaviour loses coverage.
