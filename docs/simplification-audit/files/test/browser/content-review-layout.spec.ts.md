# test/browser/content-review-layout.spec.ts
- Lines: 28 | Kind: Playwright layout check, chromium; dialogs opened by calling module functions in-page (T6) | Verdict: **MERGE** into `journeys/accessibility.spec.ts` (as a text-scale step on dialogs reached through real flows)
- Covers: the "Ask about selected content" and "Save summary" review dialogs (question, image, document, recording) stay within 360×430 at 150 % text, keep 44 px Save/Cancel targets, scroll their review region, and show the error status after a failed source/save. Duplicates: the same dialogs are opened through UI by `dev-content-question`, `dev-image-question`, `recording-question`, `document-summary-note.production`, `summary-source-note`, `web-summary-note`. Callers/importers: none. 8 tests (2 themes × 4 kinds).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-15 | T6 / P2 | Calls `reviewContentQuestion` and `reviewSummaryNote` directly with fake `source`/`save` callbacks, so the dialog is never reached the way a user reaches it. | Reach each dialog through its journey (Files "Ask Alpha", notification question, document summary, recording summary) with `app({textScale:150, viewport:{360,430}})` and call `expectFits(dialog)`. | Low. |
| 2 | 6 | P3 | Text scale set by calling `BrowserDevice.prototype.setTextScale`. | Harness `textScale` option at the bridge (`AlphaDevice`). | none |
| 3 | 3 | T4 | Theme × kind = 8 boots; theme is the sweep's job. | One theme in the journey; the sweep covers dark. | none |
| 4 | 17-22 | — | `fits()` geometry check is a reusable assertion. | Move to `harness/a11y.ts` as `expectFits(locator, viewport)`. | none |

## Proposed end state
No file. `harness/a11y.ts` gains `expectFits`; the four review dialogs are checked at 150 % text inside the journeys that open them.
