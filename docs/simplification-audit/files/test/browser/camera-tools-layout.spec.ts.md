# test/browser/camera-tools-layout.spec.ts
- Lines: 28 | Kind: Playwright, `chromium` project, real UI journey (no `/src` imports) | Verdict: **MERGE** into `journeys/camera-photos.spec.ts`
- Covers: with no camera hardware, the Camera app's six controls are on screen and hit-testable at 412x915, 360x640 and 915x412 (landscape class applied), and no "Choose image / Ask Alpha" fallback appears. Duplicates: partly `camera-media.production.spec.ts` (opens Camera and takes a photo, no geometry). Callers/importers: none (Playwright glob).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-27 | T7 | A one-test file (looped over three viewports) with its own boot code: inline `alpha.connection.selection.v1` seed and an inline `getUserMedia` stub. | Move the loop into `journeys/camera-photos.spec.ts` as a "controls reachable at phone, small and landscape sizes" step; boot through the harness `app({viewport, connection:'offline'})` and a `camera: 'absent'` media option. | Low. |
| 2 | 21-24 | none | `elementFromPoint` hit test is the useful part (catches overlap by dock/insets); `toBeInViewport({ratio:0.9999})` carries a comment about a fractional transform. | Keep both checks; move the hit test into `harness/a11y.ts` as `expectReachable(locator)` since dock-overlap checks repeat across specs. | Low. |
| 3 | 26 | B5 | Screenshot written to `outputPath` that no assertion reads. | Drop, or keep only on failure (Playwright `screenshot: 'only-on-failure'`). | none |

## Proposed end state
One step in `journeys/camera-photos.spec.ts`: for each of three viewports, open Camera from Home with the camera absent,
assert the six named controls are reachable (`expectReachable`) and the landscape class at 915x412. Run it in the
production project if the flag-off harness can provide the absent camera; otherwise chromium. Delete this file.
