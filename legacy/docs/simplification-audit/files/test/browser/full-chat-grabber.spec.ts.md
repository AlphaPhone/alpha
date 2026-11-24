# test/browser/full-chat-grabber.spec.ts
- Lines: 321 | Kind: Playwright, chromium. Real pointer, touch (CDP `Input.dispatchTouchEvent`, `page.touchscreen`) and keyboard-visibility gestures on the shell; no `/src` imports (s0/r32, 8 `waitForTimeout`) | Verdict: **MERGE into `journeys/chat.spec.ts`** (sheet gestures) **and `journeys/home-shell.spec.ts`** (raised-dock / outside-tap rules)
- Covers, as about 22 tests: the chat sheet grabber (a slow drag rests where released, snaps near the collapsed form or the top, a flick jumps to either end, Shrink returns to the left height, Minimize collapses, the full-screen header clears the status band at insets 0 and 52 with no grabber). The outside-tap rule (the first click or tap outside collapses and is captured, the next reaches the app; a drag outside neither scrolls nor pulls the shade; an inside tap does not collapse). Landscape (chat docks beside Home, Home keeps taps). The raised dock (a delayed Android click stays on the scrim; a press with no click still lowers; the pill-raised bar lowers on the first outside tap and Back lowers it before leaving; keyboard-up Home taps only close the keyboard; when the keyboard closes on its own the scrim lets go; native keyboard dismissal keeps the draft and selection; an upward drag on Home opens nothing while a drag up from the bar opens chat). Duplicates: `home-chat-anchor.spec.ts`, `composer-send-focus.spec.ts`, `assistant-surface-close.spec.ts`, `home-overlay-stability.spec.ts`, `chat-voice-mode.spec.ts` and `standalone-shell.spec.ts` all use "Resize chat" and outside-tap dismissal (research P5/T7); `files-dialog-dismissal.spec.ts:10` re-tests "first outside tap lowers the raised composer". Callers: the chromium project. Helper: `helpers/home-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22, 39, 78, 125, 197, 273, 285, 315 | T8 | Eight fixed sleeps. Some encode product timing: the 160 ms hold makes a drag "not a flick", and the 400 ms tap guard after a drag is real (77). Others wait for "nothing happened" (125, 197, 273, 315). | Name the product constants (`DRAG_HOLD_MS`, `TAP_GUARD_MS`) next to the helper. Replace the "nothing happened" sleeps with one `settled(page)` from `helpers/settled`. | Low |
| 2 | 1-321 | D11 | The file name says "grabber", but two thirds of the file is about raised-dock and outside-tap rules. | Split as in the verdict. | none |
| 3 | 10-17, 108-118, 217 | C3 | Four copies of "viewport 412×915, offline selection, goto, open conversation, wait animations". | One `openChatSheet(page, {url})` fixture. | none |
| 4 | 16, 66, 94, 117 | C3 | The "await all animations finished" one-liner is repeated four times. | One `animationsSettled(page)` helper (or `settled`). | none |
| 5 | 226-235 | — | Synthetic `PointerEvent` and late `MouseEvent` dispatch in the page reproduce the Android WebView's delayed compatibility click. This is a platform-boundary simulation; Playwright cannot produce it otherwise. | Keep, with the comment. | none |
| 6 | 298-299, 307 | — | `alpha-keyboard-visibility` custom events stand in for the native keyboard plugin. | Keep, through a `bridge.keyboard(visible)` helper. | none |
| 7 | 87-101, 103-129 | T4 | The outside-tap rules (click and touch variants) overlap `home-overlay-stability` and `assistant-surface-close`. | When merging, keep this file's versions; they are the most precise. Delete the overlapping cases from the others (their own reports decide). | Low |
| 8 | 4-6 | — | The intent header (no grabber in full screen because the top edge is Android's shade) is good. | Keep. | none |

## Proposed end state
`journeys/chat.spec.ts` gets a "sheet" block: rest on slow drag, snap zones, flick, shrink/minimize, full-screen
header insets, inside tap, landscape. `journeys/home-shell.spec.ts` gets a "raised dock and outside taps" block: first
outside tap or click captured, drag outside, delayed Android click, pill-raised bar and Back, keyboard-up Home tap,
keyboard self-close, native keyboard dismissal, upward drag. They share `openChatSheet`, `animationsSettled` and named
timing constants, with no anonymous sleeps.
