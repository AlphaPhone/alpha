# test/browser/photo-delete-accessibility.spec.ts
- Lines: 33 | Kind: Playwright, chromium; keyboard journey over "Delete all forever" in Recently deleted, seeded and patched through `/src/prototype/browser-camera.ts` | Verdict: MERGE into `journeys/camera-photos.spec.ts` (trash section), one variant
- Covers: the permanent-delete review takes focus on Cancel, hides the pill, traps Tab, closes on Escape/Cancel/Back restoring focus to its opener, and Delete forever empties the trash; a slow preparation does not let Back act early. Duplicates: `photo-album-accessibility.spec.ts` (same focus rule), `operation-review-accessibility.spec.ts`. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T7 | 4 variants (2 themes × 2 heights); only light/420 enables the slow-preparation patch. | One variant at 412×420 with the slow preparation. | Low. |
| 2 | 11 | T6 | Delays `library.prepareDeleteTrash` by replacing it in page. | Keep as the only way to slow the step, or drop the delay if the focus assertions do not need it. | Low. |
| 3 | 9-14 | T6 | Trashes the seeded photo with `library.setTrashed`. | Trash it through the UI (Delete in the viewer) in the same journey. | None. |
| 4 | 1, 3 | D11 | `guardCalendarFixture as guardNoMedia`. | Harness `noMedia()`. | None. |

## Proposed end state
One trash case: delete a photo in the viewer, open Recently deleted → Delete all forever, focus on Cancel, Tab trap, Escape/Cancel/Back restore focus, Delete forever leaves the trash empty. Delete this file.
