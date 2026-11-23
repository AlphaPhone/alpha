# test/browser/view-focus.spec.ts
- Lines: 171 | Kind: Playwright chromium, 8 tests; unit test in a browser (T6): a routed page with hand-written shell markup that does not boot the app, then `installViewFocus()` from `/src/runtime/view-focus.ts` (s1 r17) | Verdict: REWRITE as cases in `journeys/accessibility.spec.ts` on the real app
- Covers: when a screen change or HOME drops focus, focus moves to the new screen's title (tabindex −1) or the Home region; focus in the composer, an open dialog or the first screen of a load is never moved; rotation that rebuilds the focused row returns focus to the screen name; an inline modal (Apps drawer) is named without focusing its search field; keyboard users keep the focus ring and touch users do not; a resize cannot cancel a pending change; an old uninstaller cannot remove a newer observer. Duplicates: `accessibility-lifecycle.spec.ts`; `subview-accessibility.spec.ts` (focus into subviews). Callers/importers: chromium; imports `helpers/settled` (`frames`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-28 | T6 / B5 | Re-creates the shell's DOM contract (`data-alpha-layer`, `data-alpha-app-title`, inert/hidden toggling) by hand and "shows" screens by flipping attributes. If the real shell stops doing what `show()` does, this still passes. | Drive the real app: open Settings from Home, press HOME, open Apps. | Low |
| 2 | 160-171 | T6 | "Old uninstaller cannot clear a replacement observer": tests the module's install/uninstall API, no user effect. | Delete. | None |
| 3 | 142-158 | T6 | Resize-in-the-same-frame race on synthetic markup. | Delete unless the owner has seen the bug on device. | Low |
| 4 | 50-66 | — | "Focus that is somewhere real stays" (composer typing across a screen change; open dialog) is user-visible and worth keeping. | Keep in the journey. | None |
| 5 | 112-140 | — | Keyboard ring vs touch (`outline-style`) is user-visible. | Keep in the journey (mouse click vs Tab). | None |

## Proposed end state
In `journeys/accessibility.spec.ts`: "opening an app moves focus to its title, HOME moves it to Home"; "typing in the composer or an open dialog keeps focus across a screen change"; "opening Apps names the drawer without focusing Search"; "Tab shows the ring, a click removes it"; "rotation keeps focus on the screen name". All on the real shell. Drop the install/uninstall and same-frame resize cases. Delete this file.
