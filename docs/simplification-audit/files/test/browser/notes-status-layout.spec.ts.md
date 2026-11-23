# test/browser/notes-status-layout.spec.ts
- Lines: 29 | Kind: Playwright spec, chromium, 6 tests (2 themes x 3 viewports); legacy Notes with a quota fault, geometry checks | Verdict: DELETE
- Covers: the Notes storage-failure status line sits below the status bar, does not overlap the workspace or controls, and grows with large text. Duplicates: none. Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 18 | A1 | Legacy Notes; the fault targets legacy key `alpha.browser.notes.v1`. `canonical-notes-ui.ts:352` renders `storageStatus:''` (the line appears only for the legacy source). | Delete. | Low |
| 2 | 3 | T7 | Six variants of one layout check. | n/a. | None |
| 3 | 24 | T6 | Injects a style tag to enlarge the status text. | n/a. | None |

## Proposed end state
File deleted. If canonical Notes shows a storage/save status, add one layout assertion (one theme, smallest viewport) to the canonical failed-save step.
