# test/browser/home-overlay-stability.spec.ts
- Lines: 37 | Kind: Playwright gesture/layout spec (chromium) | Verdict: MERGE into `journeys/home-shell.spec.ts` (with `home-chat-anchor.spec.ts`)
- Covers: on the launcher shell with a 48 px native bottom inset, the Home Inbox icon does not move by ≥1 px in any frame while the chat sheet is dragged and while its resting controls animate in. Duplicates: `home-chat-anchor.spec.ts:4-41` (anchor through open/drag/collapse, coarser sampling). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | T6 | Adds `native-phone` class and `--native-bottom-inset` by hand to imitate the Android WebView. | Have the native-bridge harness report the inset through `DailyApps.surfaceInfo` (bottomInset:48) so the product sets the class itself. | Low |
| 2 | 18 | T8 | `waitForTimeout(500)` to let the entry animation finish. | Wait on `getAnimations()` finished promises. | Low |
| 3 | 3-36 | T4 | Same claim as the chat-anchor drag. | One merged frame-sampled test. | Low |

## Proposed end state
Merged into "Home stays put while chat opens, drags and collapses" in `journeys/home-shell.spec.ts`, frame-sampled, with the native inset coming from the bridge stub. File deleted.
