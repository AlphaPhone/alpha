# test/browser/scan-native-page-camera.spec.ts
- Lines: 95 | Kind: Playwright journey (`chromium`) with a private Android bridge (`ElizaCamera`, `AlphaConnection`, `Agent`, …); real Camera → Scan document UI; 2 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan section); the bridge moves to `harness/plugins/camera.ts`
- Covers: on Android, Scan document captures through the bound native camera. There is one `startPreview`, `capturePhoto` is called with `{jpeg, q85, saveToGallery:false, 2048×1536}`, and `getUserMedia` is never called. Pages are reviewed, retaken and kept as a draft, and the draft is loaded again. A cancel or Home press while a capture is delayed drops the late page and restores the covered dialogs. Duplicates: `scan-page-camera.spec.ts` (the same flow on the web `getUserMedia` path). Callers/importers: none. It imports `scan-review-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-50 | C4 / T7 | A 40-line private Capacitor bridge, one of 57 hand-written fakes. | Use `harness/plugins/camera.ts` (ElizaCamera with `hold`/`release`, colour per capture, a call log) on `harness/bridge.ts`. | Low |
| 2 | 46-49 | – | The entry is real (Camera → Scan document). | Keep. This is the model for the other scan specs' entry. | none |
| 3 | 76 | B5 | Screenshot with no consumer. | Delete. | none |
| 4 | 87 | T8 | `setTimeout(resolve,0)` in the page after release. | Use `expect.poll` on the image count. | none |
| 5 | 92 | – | `launcher-home` is dispatched as a window event. It is the native Home signal. | Use `harness/nav.ts` `pressHome(page)`. | none |

## Proposed end state
This becomes the Scan section's Android entry. Its `scanFromCamera(page)` helper is used by the other scan steps, and
its two tests stay: capture, retake and draft resume; and late native pages dropped on cancel and Home. The camera fake
lives in the harness.
