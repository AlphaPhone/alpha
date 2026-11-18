# test/browser/scan-review-keyboard.spec.ts
- Lines: 27 | Kind: Playwright spec (`chromium`); opens three scan dialogs by module import and sets `--browser-text-scale` directly (T6); 6 tests (3 dialogs × 2 themes) | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan section, large-text step)
- Covers: at 150 % text in a 740×360 window, the document, correction and searchable-PDF reviews can be reached with Tab, the "Review details" region scrolls with PageDown, every action is on screen and at least 44 px, and Escape closes. Duplicates: `scan-pdf.spec.ts` layout tests, `scan-correction.spec.ts` compact fit. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 10-12 | T6 | It writes `--browser-text-scale` instead of choosing Settings → Display → Text size, and opens the three dialogs by import (`reviewSearchableScan` with hand-built text layers). | Set the text size through the harness text-scale helper. Reach the three reviews from the document (Correct page 1, Download searchable PDF with `stubOcr`). | Low |
| 2 | 18 | T6 | It forces `tabIndex=-1` on the `h2` to start the Tab order. | Start from the dialog's initial focus. | Low |
| 3 | 3 | T7 | Theme does not affect scrolling or geometry. | Run one theme only: 3 cases instead of 6. | none |

## Proposed end state
One "large text" step in the Scan section. After setting the large text size, it opens the document, correction and
searchable reviews in turn, Tabs to the details region, pages down, checks that the actions are on screen and 44 px, and
presses Escape. It runs in one theme.
