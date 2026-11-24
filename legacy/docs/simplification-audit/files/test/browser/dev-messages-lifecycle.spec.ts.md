# test/browser/dev-messages-lifecycle.spec.ts
- Lines: 51 (7 tests) | Kind: Playwright `chromium`, dev build; UI with swipe gestures on the Messages simulator; init script replaces `window.setTimeout` | Verdict: **MERGE** into `journeys/telephony.spec.ts` (2 cases)
- Covers: search finds sent text after reload; a deleted thread is not resurrected by delayed canned replies and Undo keeps another thread's newer message; failed photo send keeps the tray; Undo keeps a new conversation with the same contact; failed Undo and failed swipe delete retry; a fresh tap is not swallowed by the swipe guard. Duplicates: `dev-phone-messages.spec.ts` (message send and reload); `message-actions.spec.ts` (long-press actions). Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P10, P3 | Init script replaces `window.setTimeout`: 2600 ms callbacks (canned replies) are captured and 5000 ms timers become 60 s. A second time source that changes every timer in the app. | Use `page.clock.install()`; no `setTimeout` replacement. | Low |
| 2 | 8-10 | — | Search finds sent text after reload. | Carry. | none |
| 3 | 11-13 | P7 | Resurrection by delayed canned replies tests the simulator's scripted replies. | Delete. | Low |
| 4 | 14-16, 21-30, 32-41 | P3 | Throwing `setItem` for photo send, Undo and swipe delete. | Delete. | Low |
| 5 | 17-19 | — | Swipe delete, start a new conversation with the same contact, Undo keeps the new one. | Carry. | none |
| 6 | 44-51 | P10 | Freezes `Date.now` to hold the swipe guard, then checks a new tap opens a thread. | Carry on the installed clock (`clock.pauseAt`), no `Date.now` override. | none |
| 7 | 6 | — | `remove()` performs a real pointer swipe. | Move to `harness/nav.ts` as `swipeRow`. | none |

## Proposed end state
Two cases in the Messages part of the telephony journey: "search after reload" and "swipe delete with Undo" (Undo keeps a newer conversation; the next tap after a swipe opens the thread). Delete the file.
