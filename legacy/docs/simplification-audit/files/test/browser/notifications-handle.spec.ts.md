# test/browser/notifications-handle.spec.ts
- Lines: 246 | Kind: Playwright, chromium; real pointer and CDP touch drags on launcher/standalone Home, with style pokes and one `/src` import | Verdict: MERGE into `journeys/home-shell.spec.ts` (Home gestures section)
- Covers: Home has no notifications control; on launcher Home a downward pull on empty Home opens the development stand-in for Android's shade (Close, Escape, Back close it), while the status band, sideways drags, open sheets, app views, a focused composer and a scrolled Home keep their own gestures; Home content starts below the status-bar inset; every Home app stays above the dock at 200 % text. Duplicates: `test/gesture-zones-single-instance.test.mjs` (names this spec as its counterpart), `home-compact-scroll.spec.ts` (same clearance-height overflow trick, 200 % text), `home-launcher.spec.ts`. Callers: chromium project only; no script or workflow names it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-13 | A8 | Header narrates issue numbers (#416/#417) and lists instrumented tests. | One sentence: Chromium has no Android shade; the development stand-in shows the pull decision. | None. |
| 2 | 39-55 | T4 | "No notifications control" asserted twice (standalone l.42, launcher l.54). | Keep one. | None. |
| 3 | 57-86 | T4 | "Pull on empty Home opens the shade" from the middle is repeated in the next test's three-start loop. | One test: loop of three starts, then Close/Escape/Back. | None. |
| 4 | 119-137, 139-152, 208-245 | T4, T6 | Three tests force overflow by setting `[data-alpha-home-clearance]` height in page; the mouse (l.119) and CDP-touch (l.208) variants both prove "scrolled Home scrolls back before a pull opens the shade". | Keep the touch test and the `fits`/`touch-action` check from l.139 at one viewport; drop l.119. | Low. |
| 5 | 165-174 | T7 | 3 widths × 5 insets set `--native-top-inset` directly for one lower-bound rule. | 360 and 480 px with insets 24 and 100. | Low. |
| 6 | 176-190 | T6, T5, T8 | 200 % text via `import('/src/browser/display.ts').installBrowserDisplay()`; `waitForTimeout(350)`; overlap checked with the home-built `accessibility-audit` checker. Overlaps the 200 % case in `home-compact-scroll.spec.ts`. | Set text size through Settings → Display (or a harness option); rely on the gap poll; move to `journeys/accessibility.spec.ts`, one copy. | Low. |
| 7 | 69, 194-201 | P2, T7 | Back by `dispatchEvent('alpha-back')`; local touch helper with 16 ms sleeps per step. | Harness `androidBack()` and `touchDrag()`. | None. |
| 8 | 217-225 | D8 | `emptyHome()` scans the screen on a 4×12 px grid with `elementFromPoint`. | A stable locator for empty Home, or one fixed coordinate. | Low. |

## Proposed end state
Four cases in `journeys/home-shell.spec.ts`: (1) standalone Home: no control, no pull opens anything; (2) launcher: pulls from three starts open the shade, Close/Escape/Back close it; (3) status band, sideways drag, open conversation, app view and focused composer never open it; (4) real touch on an overflowing short screen: up scrolls, down scrolls back, at top opens the shade, plus the `pan-x pinch-zoom` fit check. The inset bound becomes two parametrised cases; the 200 % reachability case moves to the accessibility journey. No `/src` import.
