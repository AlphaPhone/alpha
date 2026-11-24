# test/browser/chat-message-polish.spec.ts
- Lines: 27 | Kind: Playwright, `chromium` project; seeds the transcript through a captured shell's `setState` (P2, P3) then drives the message-actions menu | Verdict: **MERGE** the Copy case into `journeys/chat.spec.ts`; DELETE the CSS-pinning cases
- Covers: Copy from message actions copies the exact text (whitespace, Unicode), announces "Copied." through a visually-hidden polite region, reports failure as a status, keeps the menu still, supports End and Escape with focus return; pressed actions keep a 10 px radius without geometry change; the transcript scroll fade shows only on overflowing edges. Duplicates: message actions in `message-actions.spec.ts`, `message-reply-edit.spec.ts` and many production specs. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | P3, P2 | Shell captured with a `renderVals` patch; `canReplyMessage` overridden; messages injected with `setState({msgs})`. | Seed the conversation history through the agent fixture (resident stub `history`) and open it. | Low. |
| 2 | 18-21 | none | Copy, announcement and keyboard behaviour are real accessibility behaviour. | Carry into `journeys/chat.spec.ts` "message actions" (merge with `message-actions.spec.ts`). | none |
| 3 | 22-24 | T1-adjacent | Pressed state asserts `border-radius: 10px` and an unchanged bounding box for three actions; writes a geometry JSON file. This pins CSS values. | Delete. | Low. |
| 4 | 25-27 | T6 | Scroll fade reads the private CSS variables `--calendar-scroll-fade-top/bottom` (named after Calendar) at three scroll positions and two sizes. | Delete; if the fade matters, one `toHaveScreenshot` of the middle position. | Low. |
| 5 | 3-6, 12-17 | A8 | Comments explaining timing workarounds (`setState` callback not awaited, two-frame reads). | Gone with the rewrite. | none |
| 6 | 23, 26 | B5 | `writeFile` of JSON evidence nobody reads. | Drop. | none |

## Proposed end state
One "Copy message" step in the chat journey's message-actions test (exact text, polite announcement, failure status,
End/Escape focus return). Delete this file.
