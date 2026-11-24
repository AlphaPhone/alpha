# test/browser/photos-grid-density.spec.ts
- Lines: 59 | Kind: Playwright, chromium (touch, mobile); synthetic pinch `TouchEvent`s dispatched on the grid over `helpers/photos-bridge` with 120 native rows; layout arithmetic in page | Verdict: MERGE into `journeys/camera-photos.spec.ts` (grid section)
- Covers: pinching changes the grid between 3, 4 and 5 columns; the virtualised grid's scroll height matches its rows and gaps at top and middle; side margins are 12 px; only a window of tiles is rendered and at least two rows are on screen. Duplicates: `photo-order.spec.ts` (virtual grid paging), `photos-pending-read.production.spec.ts` (deep window). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T6 | Pinch built from synthetic `TouchEvent`s dispatched by script rather than CDP input. | Use the harness CDP `pinch()` (as `photos-clean-controls.spec.ts:60-67` does). | Low. |
| 2 | 15 | T7 | Two viewports. | Keep 412×915; the tablet width adds little for a phone product. | Low. |
| 3 | 38-46 | D10 | Recomputes expected scroll height from CSS to check alignment (implementation maths). | Keep (it is the regression it guards), but as one helper. | None. |
| 4 | 19-27 | C3 | Inline 120-row `list` override. | `photosBridge(page, {rows: 120})` option. | None. |

## Proposed end state
One case: 120 photos, pinch in/out through 3/4/5 columns via CDP, at top and middle the scroll height matches rows, margins are 12 px, the render window is bounded and covers the screen.
