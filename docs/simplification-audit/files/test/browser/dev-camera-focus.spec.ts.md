# test/browser/dev-camera-focus.spec.ts
- Lines: 54 (7 tests) | Kind: Playwright `chromium`, dev build; 2 UI tests, 5 unit tests of `BrowserCameraFocus` with fake `MediaStreamTrack`s (T6) | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (2 cases)
- Covers: tap-to-focus places the focus target at the tapped viewfinder coordinates, clears on camera switch and Home, keyboard Enter focuses the centre; plus focus-point mapping through mirrored zoom and serialised hardware writes. Duplicates: the write serialisation (lines 39-54) is modelled by `specs/quint/refinement/application/camera-focus-writes.mjs` / `test/quint-camera-focus-writes.test.mjs`. Callers/importers: `chromium` project; imports `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-13 | C3, T7 | Canvas-stream `getUserMedia` fake (and `captureStream` recorder) is a verbatim copy of `dev-camera-light.spec.ts:3-13`; `dev-image-question.spec.ts:4,22` has a third variant. | One `harness/camera.ts` fixture (`fakeCamera(page,{paint})`). | none |
| 2 | 14-19 | — | Real journeys: tap focus at 25 %/30 %, switch camera clears, Home clears; keyboard Enter on the "Viewfinder. Tap to focus" button. | Carry both. Drop the `page.screenshot` evidence file. | none |
| 3 | 20-22 | T6 | Calls `browserCamera.setFocusPoint({x:-2,y:5})` in-page and dispatches a synthetic `pagehide`. | Delete. | Low (clamping only). |
| 4 | 23-30 | T6, T3 | Unit test of coordinate mapping through 2x zoom and mirroring on a detached `div`/fake track. | Delete. | Medium: the mirrored-zoom mapping maths (`{x:.5625,y:.625}`) has no other test. Listed as coverage at risk. |
| 5 | 31-54 | T6, T4 | Three unit tests of late replies, serialised writes and retirement with hand-built tracks; duplicate of the Quint camera-focus-writes refinement. | Delete. | Low (Quint keeps it). |

## Proposed end state
In `journeys/camera-photos.spec.ts`, one "focus" step list on the shared fake camera: tap at a known point and check the target position, switch camera (target gone), tap again, Home (target gone), then keyboard Enter on the viewfinder focuses the centre. Delete the file.
