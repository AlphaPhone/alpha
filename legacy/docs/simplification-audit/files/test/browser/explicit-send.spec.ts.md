# test/browser/explicit-send.spec.ts
- Lines: 33 | Kind: Playwright, chromium, dev mode. `LocalAgentProtocol.prototype.send/messages/listConversations/truncateMessages` and `Component.prototype.renderVals` are patched in the page (P3). The action under test is a direct call to the captured shell's `send('Suggested prompt')` (T6) | Verdict: **MERGE into `journeys/chat.spec.ts`** (REWRITE through a suggestion chip)
- Covers: an explicit prompt (what a suggestion chip sends, `data-adapter.ts:140` `go:()=>this.send(label)`) with an empty composer posts once and shows one user bubble. While a message edit is open, it is refused with "Finish or cancel the message you are editing first." and the edit is kept. Duplicates: `chat-continuity.spec.ts` ("pressing Send twice dispatches one message") covers the single-dispatch rule for typed sends. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | P3 | Product classes are patched to fake the agent. | Use the harness agent fake (the resident/local agent stub at the bridge) with a recorded `posts` list. | none |
| 2 | 20, 28, 32 | T6 | `shell.send(...)` and `shell.messageEditTarget` are reached through the captured `Component` instance. | Tap a visible suggestion chip instead, and assert the edit is kept through the composer value. Drop the `messageEditTarget` check. | Low |
| 3 | 6 | P2 | `connectionController.initialize()/startDevelopment('local')` is called in the page. | Connect through the harness default connection. | none |
| 4 | 13 | — | The "Original request" via Enter then "Reply 1" setup is a real UI action. | Keep. | none |

## Proposed end state
Two tests in the "send" block of `journeys/chat.spec.ts`: "a suggestion chip posts once and shows one bubble" and "a
suggestion chip while editing is refused and keeps the edit". Both use the harness agent fake and tap a visible chip.
