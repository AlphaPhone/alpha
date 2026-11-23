# test/browser/dev-camera-light.spec.ts
- Lines: 23 (3 tests + 2 loop = 4) | Kind: Playwright `chromium`, dev build, UI with 2 in-page imports | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (1 case)
- Covers: the screen-light (front flash substitute) toggles without a torch, never filters the saved photo, and retires on camera switch, Home, `pagehide` and track `ended`. Duplicates: `camera-controls.spec.ts` "flash requires a confirmed torch capability and never applies a brightness filter" covers the no-filter rule. Callers/importers: `chromium` project; imports `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-13 | C3 | Same fake camera as `dev-camera-focus.spec.ts:3-13`. | `harness/camera.ts`. | none |
| 2 | 15-16 | T6 | Captured-pixel check reads `browserPhotoLibrary.list()` via `/src/prototype/browser-camera.ts` and decodes the data URL in-page. | Open the capture in Photos and sample the rendered `img` instead. | Low |
| 3 | 18-20 | — | Real journey: light on, switch camera, light off; Home; all streams ended. | Carry as steps. | none |
| 4 | 21-23 | T6 | Synthetic `pagehide` and track `ended` events. | Keep the `ended` case as one step (camera loss is a real event); drop `pagehide`. | Low |
| 5 | 15 | B5 | Screenshot written as evidence. | Drop. | none |

## Proposed end state
One "screen light" step list in the camera journey: turn on, take a photo, check the saved photo's pixel is unfiltered (via the Photos view), switch camera clears it, Home clears it and ends streams, track `ended` clears it. Delete the file.
