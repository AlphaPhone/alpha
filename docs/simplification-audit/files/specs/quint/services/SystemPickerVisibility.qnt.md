# specs/quint/services/SystemPickerVisibility.qnt
- Lines: 97 | Kind: Quint model (services family, live; 6 tests, 4 witnesses, 12 symbol pins) | Verdict: KEEP (owns picker visibility; `ScanDocument` drops its copy)
- Covers: `prototype/scan-pdf.ts` `duringSystemPicker`/`systemPickerActive` and `browser/file-picker.ts` `runFilePicker`: a counter of pickers in flight exempts scan review, document and searchable dialogs from the hidden-page close; correction and capture always close; pagehide closes everything; one owned file-picker consumer, late results of retired pickers dropped. Sources exist (`scan-pdf.ts`, `file-picker.ts`, `scan-review.ts`, `scan-document.ts`, `scan-searchable-review.ts`, `scan-correction-review.ts`, `scan-page-camera.ts`). Duplicates: `ScanDocument.qnt` picker/hide half; Playwright `scan-edges.spec.ts`. Callers/importers: manifest; harness `refinement/services/system-picker-visibility.mjs` (loads the real `scan-pdf.ts` and `file-picker.ts` through `application/notes-files-media-itf.mjs` `loadProductModule` with module stubs; optional `rewrite` hook used only by mutation callers); `forward-replays.mjs` + `test/quint-system-picker-visibility.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | `loadProductModule(..., {rewrite})` lets callers text-transform product source before bundling. Default replay passes none. | Remove the `rewrite` option if no remaining caller uses it after mutant tests are dropped. | Low |
| 2 | manifest symbols | T10 | 12 pins including `systemPickers`, `inputFiles`. | File pins. | Low |
| 3 | 39-40 | — | `pageHide` retires the live file picker as well; covered by `realBackgroundUnderPickerTest`. | Keep. | — |

## Proposed end state
Unchanged model, the single owner of picker visibility; run once.
