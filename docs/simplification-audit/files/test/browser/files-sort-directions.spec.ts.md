# test/browser/files-sort-directions.spec.ts
- Lines: 36 | Kind: Playwright, chromium, dev mode. A UI journey (Files tools menu, sort dialog, grid/list), seeded through `registerPlugin` with 20 ms gaps (s1/r15) | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: the All files view shows New folder, Sort files and Grid view. All six sort directions (name, size, date × asc/desc) order three files correctly. Choosing a new field resets to that field's conventional order. Grid and list toggles keep the order. Duplicates: none found. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | T8 | `setTimeout(resolve,20)` between imports orders the modification times by wall clock. | Seed with explicit `modified` timestamps through the harness file seed. | Low |
| 2 | 24 | — | `names()` reads `aria-label` slices from the DOM. That is a visible-state read and acceptable. | Keep. | none |
| 3 | 11 | P2 | Seeding through `registerPlugin` in the page. | Use the harness seed. | none |

## Proposed end state
One "sort and view" test in `journeys/files.spec.ts` with deterministic seeded timestamps.
