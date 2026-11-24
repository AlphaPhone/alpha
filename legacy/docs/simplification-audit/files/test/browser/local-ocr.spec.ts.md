# test/browser/local-ocr.spec.ts
- Lines: 101 | Kind: Playwright, `chromium`, 5 tests. Tests 1, 2, 4, 5 import `/src/prototype/local-ocr.ts` or `/src/prototype/scan-review.ts` in-page and replace `window.Worker` (T6); test 3 is a Camera → chat "Scan this" → review → Save to Notes journey using the legacy Notes source | Verdict: MERGE into `journeys/camera-photos.spec.ts` (scan section)
- Covers: real English OCR runs from locally served assets with no remote request; cancellation terminates the worker; Camera Scan saves only corrected text to Notes once; an unconfirmed save keeps the draft and cannot duplicate; closing during model load terminates the worker. Duplicates: `journey-j01-poster-calendar.spec.ts` (same Camera→Scan→real OCR path), `scan-event.spec.ts`, `helpers/ocr-stub.ts` users. Callers/importers: none; imports `openLegacyNotes`, `returnToApps`, `stubOcr`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64, 69, 72-73 | A1 | Test 3 opens "Previous notes" (`openLegacyNotes`) and reads `readBrowserNotesRaw` (legacy store, D1). | Open current Notes via `helpers/canonical-notes.ts`; assert the saved note in the Notes list. | Medium: the scan "Save to Notes" target after A2 must be the canonical store. |
| 2 | 6-36 | T6 | Test 1 calls `recognizeLocalText` directly; its valuable part is "OCR assets load from this origin, nothing remote". | Fold the asset/remote-request observation (and the Worker importScripts audit) into the Camera Scan step. | Low. |
| 3 | 38-51 | T3, T6 | Worker termination on abort is a unit check with a patched `Worker`. | Delete. | Low: leak-only, no user-visible effect. |
| 4 | 77-87 | T6 | `openScanReview` opened with a test save callback; no UI route. | Delete, or reproduce through the UI by making the Notes bridge write return unconfirmed. | Low. |
| 5 | 89-101 | T6 | Opens the review by import; the "Cancel scan during model load" behaviour is user-visible. | Carry through the Camera route with the held `eng.traineddata.gz` request; drop the `Worker` patch and assert the dialog closes and does not reopen. | Low. |
| 6 | 57-62, 66 | C3 | Synthetic camera and composer snippet copied from J01. | Shared `syntheticCamera`, `askAlpha` helpers. | Low. |

## Proposed end state
File deleted. `journeys/camera-photos.spec.ts` scan section: "Camera scan → review → corrected text saved once to Notes, OCR assets local only" and "cancel during model load closes the review for good", next to J01.
