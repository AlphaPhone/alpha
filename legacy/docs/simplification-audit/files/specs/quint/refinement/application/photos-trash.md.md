# specs/quint/refinement/application/photos-trash.md
- Lines: 24 | Kind: harness documentation for `photos-trash.mjs` (live, `index.mjs:75`, `test/quint-photos-trash.test.mjs`) | Verdict: MERGE into the header of `photos-trash.mjs`, then delete
- Covers: scope and bounds of the PhotosTrash replay (native Trash load, coalescing, paging, visibility, disposal).
- Duplicates: the harness assumptions. Referenced by nothing (grep: no hits outside the audit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | A8 | "The source previously cleared native Trash rows on hide…" is a changelog of a fixed bug. | Drop; keep the current contract and bounds (lines 3-8, 17-24) as a short header comment. | None. |

## Proposed end state
Removed.
