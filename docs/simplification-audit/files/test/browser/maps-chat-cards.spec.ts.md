# test/browser/maps-chat-cards.spec.ts
- Lines: 38 | Kind: Playwright rendering check driven by monkey-patching `Component.prototype.renderVals` and calling `shell.setState` (T6 / D2); project `chromium`, 2 tests (light/dark), dev profile | Verdict: **REWRITE** as part of `journeys/chat.spec.ts` ("agent Maps cards")
- Covers: agent replies carrying `[MAPSCARD]` and `[CHOICE:maps-share]` markup render as a route card and a two-button choice (no raw markup, 44px targets, no horizontal scroll); choosing "Don't share" sends the exact reply text. Duplicates: none. Callers/importers: none; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-22 | T6 / D2 | Captures the shell by wrapping `Component.prototype.renderVals`, replaces `shell.send`, and injects messages with `setState`. It bypasses the real send/receive path, so a parser change in the transport would not be caught. | Return the card text from the fake agent (`LocalAgentProtocol` fake as `message-actions.spec.ts` does, or the shared agent fake) and send a real user turn. Observe the reply through the agent fake's received messages. | Low |
| 2 | 17 | T6 | Polls `connectionController.getSnapshot().session` through a `/src` import. | Wait on the visible composer instead (already done on line 18). | none |
| 3 | 24 | T4 | Light/dark doubles the test; only the screenshot differs. | One theme in the journey; the theme sweep belongs to the a11y sweep. | none |

## Proposed end state
One test in `journeys/chat.spec.ts`: the fake agent answers with a route card and a share choice; the test checks the
card text, the attribution, the two 44px buttons, no raw markup and the exact reply sent after "Don't share". No
prototype patching.
