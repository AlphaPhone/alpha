# test/photo-viewport.test.mjs
- Lines: 31 | Kind: unit (direct import of `apps/app/src/prototype/photo-viewport.ts`; fake pointer events and element) | Verdict: DELETE; REWRITE the unique cases in `journeys/camera-photos.spec.ts`
- Covers: photo viewer gestures: zoom/pan clamp to the fitted image and survive element replacement, reset for a new source; pinch zooms without navigating or toggling controls; swipe navigates when fitted; zoomed arrow keys pan; callbacks after leaving do nothing; video refuses zoom. Duplicates: `test/browser/photos-clean-controls.spec.ts:3,60` (CDP touch pinch and info swipe on the real viewer). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-31 | T3 | Unit test of one pure gesture module with fakes for DOM and pointers. | Delete. | Low |
| 2 | 19-23 | T4 | Pinch is driven for real in `photos-clean-controls.spec.ts`. | Keep there. | None |
| 3 | 12-18, 24-31 | - | Not covered in a browser: keyboard `+`/arrow pan when zoomed, double-tap on a video does not zoom, a new photo resets zoom. | Journey cases. | Low |

## Proposed end state
File deleted. `journeys/camera-photos.spec.ts` viewer section: pinch (existing), keyboard zoom and pan with the image staying inside the frame (check `transform` on the image), swipe to next photo when not zoomed, next photo opens unzoomed, a video ignores zoom.
