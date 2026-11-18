# specs/quint/services/ScanReviewDialogs.qnt
- Lines: 150 | Kind: Quint model (services family, live; 8 tests, 6 witnesses, 14 symbol pins) | Verdict: KEEP model; PORT harness (text-injects inspect hooks)
- Covers: four scan dialogs as independent machines: text review (one-shot Save to Notes latched even when unconfirmed, retryable photo PDF, Keep photo retry only after a retryable failure, Back closes the document first), searchable review (close before/after provider request), page correction (corner change discards preview), page capture (frame kept when the camera stops). Sources exist (`prototype/scan-review.ts`, `scan-searchable-review.ts`, `scan-correction-review.ts`, `scan-page-camera.ts`). Duplicates: Playwright `test/browser/scan-correction.spec.ts`, `scan-page-camera.spec.ts`, `scan-review-keyboard.spec.ts`, `scan-searchable.spec.ts`, `media-polish.spec.ts` drive the same dialogs. Callers/importers: manifest; harness `refinement/services/scan-review-dialogs.mjs` (esbuild bundle with module stubs + JSDOM); wrapper `test/quint-scan-review-dialogs.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 31-37 | T10 | The esbuild `onLoad` hook reads `scan-review.ts` and `scan-searchable-review.ts` as text and inserts `globalThis.scanReviewInspect=()=>({closed,attempted,pdfAttempted})` before the literal `'  return dispose;'`, and `globalThis.scanSearchInspect=()=>({closed,ready,busy,requested})` before `'  void(async()=>{for'`; mutant `notes-unlatch` rewrites the literal guard `if(attempted||!field.value.trim())return;`. Any reformat breaks all three. | PORT: observe through the DOM only (Save to Notes / Export / Keep buttons' `disabled`, dialog `open`, the result the promise resolves) under JSDOM; no product export needed. Drop the text mutant (expected-failure mutants belong to the model's own `unlatchedEnd`-style actions, not source edits). | Medium: formatter (D9) breaks it today |
| 2 | manifest symbols | T10 | 14 pins include closure locals (`attempted`, `pdfAttempted`, `keeping`). | File pins. | Low |
| 3 | 4, 10 | — | Four machines share one `State` only for convenience; no cross-dialog invariant. | Keep (one module is simpler than four). | — |

## Proposed end state
Model unchanged. Harness bundles the real modules with port stubs and reads state from the DOM; no source text edits; runs once.
