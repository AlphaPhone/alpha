# test/browser/dev-image-question.spec.ts
- Lines: 36 (4 tests) | Kind: Playwright `chromium`, dev build; 3 UI tests with in-page seeding, 1 module-in-page test | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (2 cases)
- Covers: asking while in Camera reviews an unsaved frame (no photo saved), Cancel releases the review, Use in conversation composes "Source: Camera frame"; an imported photo's Ask Alpha opens a compact image attachment without a review dialog; cancelling local text recognition terminates its worker; the Ask shutter mode reviews one unsaved frame. Duplicates: `camera-controls.spec.ts` "Ask mode reviews an unsaved frame and returns to Camera without adding a photo" (same as lines 21-36). Callers/importers: `chromium` project; imports `helpers/owned-photo.ts` (`choosePhotoAction`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 22 | C3 | Third copy of the canvas `getUserMedia` fake (two copies in this file). | `harness/camera.ts`. | none |
| 2 | 3-9 | P2 | Typed question in Camera → review → Cancel is UI; the second half re-opens the review by calling `camera-adapter.ts` `askAboutCapture()` in-page. | Carry; re-open through the Ask control. | Low |
| 3 | 7, 32 | T6 | "No photo saved" is checked with `browserPhotoLibrary.list()`. | Check the Photos view or the last-capture thumbnail. | Low |
| 4 | 10-13 | P2 | Imported photo seeded with `importBrowserPhoto`; 90 s timeout. | Carry; import through Photos; default timeout. | Low |
| 5 | 14-19 | T6, P3 | Replaces `window.Worker` and calls `reviewContentQuestion` directly. | Delete. | Low: worker termination on Cancel loses coverage. |
| 6 | 21-36 | T4 | Duplicate of the `camera-controls` Ask mode test. | Keep one copy (this one has the composed-text assertion). | none |

## Proposed end state
Two cases in the camera journey: "ask about what the camera sees" (type a question or use Ask mode, review the unsaved frame, Cancel, ask again, Use in conversation, check the composer, no photo added) and "ask about a saved photo" (compact attachment, no review dialog). Remove the duplicate from `camera-controls.spec.ts` when merging. Delete the file.
