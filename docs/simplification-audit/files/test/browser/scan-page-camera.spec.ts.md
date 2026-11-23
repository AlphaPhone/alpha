# test/browser/scan-page-camera.spec.ts
- Lines: 16 | Kind: Playwright spec (`chromium`); entry by importing `scan-document.ts` (T6); web `getUserMedia` fake from a canvas stream; one test injects a fake viewfinder element into the DOM; 4 tests | Verdict: **MERGE** tests 1-3 into `journeys/camera-photos.spec.ts` (Scan section, browser-camera variant); **DELETE** test 4
- Covers: the web camera path of document capture. Captured and retaken pages enter the document only after review, and every stream is stopped. Back cancels a pending camera request and stops its late stream without closing the document. A denial allows a fresh capture, and pagehide stops the camera. Test 4: the document camera borrows cloned tracks from an active Camera preview and does not stop it. Duplicates: `scan-native-page-camera.spec.ts` covers the same review/retake rules on the Android path. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-16 | T6 | Test 4 fabricates a `[data-alpha-camera=viewfinder]` element with its own stream in the DOM, so the product Camera is not involved. | Delete, or rewrite as Camera app open → Scan document → Cancel, with the preview still live. | Low |
| 2 | 3 | T6 | Entry by module import. | Open from the Camera app with `harness/browser.ts` `fakeCamera(page)` (the same fake `responsive-surfaces.production` uses). | Low |
| 3 | 6 | D8 | A 2,000-character test line with the pixel-sampling closure pasted three times. | Use a `videoPixel(locator)` helper. | none |
| 4 | – | Owner question | Production Android uses the native camera (`scan-native-page-camera` asserts that `getUserMedia` is never called). The web path runs only in the browser/dev build. | If the browser build is not a product, keep a single web-camera test or none. | – |

## Proposed end state
At most one browser-camera test in the Scan section: capture, retake and use, Back during a pending request, denial and
then retry, all streams ended. It uses the shared camera fake and opens from Camera. Whether it stays depends on whether
the browser build is a product surface.
