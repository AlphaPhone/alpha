# test/browser/camera-controls.spec.ts
- Lines: 116 | Kind: Playwright, chromium (touch), 9 tests; 4 module-in-page against `browserCamera`, 5 rendered UI (s10 r32, CDP touch) | Verdict: MERGE into `journeys/camera-photos.spec.ts`
- Covers: digital zoom changes saved pixels and keeps front-camera mirroring; zoomed video/thumbnail use the crop and release streams; flash requires a confirmed torch capability; rendered zoom capture; zoomed recording stops when the source ends; Ask mode reviews an unsaved frame without saving; last capture opens and Back returns; failed camera switch resets flash and zoom; two-finger pinch zooms without tap focus. Duplicates: Zoom controls also in `media-polish.spec.ts`, `responsive-surfaces.production.spec.ts`; Ask review also in `camera-media.production.spec.ts`, `dev-image-question.spec.ts`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-46, 55-61 | T6 | Four tests call `browserCamera.capturePhoto/setZoom/switchCamera/startRecording/setSettings` directly. | Keep the observable outcomes via controls: Zoom 2x → Take photo → pixel check (already test 48); Switch camera → mirrored preview; recording via Video mode. | Low |
| 2 | 41 | P3 (boundary) | Overrides `track.getCapabilities/applyConstraints/getSettings` for torch. This is the media-track boundary, acceptable. | Move into the harness fake camera (`torch:true|false|unconfirmed`) and drive the Flash button. | Low |
| 3 | 88-90 | P3 | Replaces `browserCamera.flashAvailable/lightingLabel/setSettings/setZoom/switchCamera` on the module singleton to fail the switch. | Fail the switch at `getUserMedia` (facingMode front rejects) in the harness camera. | Medium: exercises a different failure, keep the reset assertion. |
| 4 | 49, 52, 92, 98 | T1-like | `toHaveCSS('width','40px')` as the "selected" signal. | Use `aria-pressed` on the zoom chip (product markup) or the visible label. | Low (product markup change) |
| 5 | 28 | T8 | `setTimeout(750)` recording wait. | Poll file size. | None |
| 6 | 4-11 | C4 | Synthetic camera canvas duplicated in `browser-video.spec.ts`, `camera-media.production.spec.ts`. | One harness `fakeCamera({pattern,audio})`. | None |

## Proposed end state
Camera section of `journeys/camera-photos.spec.ts` on the harness fake camera: zoom chip crops saved pixels; front camera mirrors; pinch zoom without focus ring; flash only with confirmed torch; failed switch resets flash and zoom; Ask mode adds no photo; last capture opens and Back returns. About 60 lines. Delete this file.
