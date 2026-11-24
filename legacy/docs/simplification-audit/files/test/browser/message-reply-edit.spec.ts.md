# test/browser/message-reply-edit.spec.ts
- Lines: 51 | Kind: Playwright journeys on the dev profile with prototype-level agent fakes; two cases call controller methods directly (T6); project `chromium`, 10 tests | Verdict: **MERGE** into `journeys/chat.spec.ts` (reply/edit block)
- Covers: Reply sends `replyToMessageId` without quoting prose; Edit and resend asks for confirmation, cancel keeps everything, confirm truncates once then resends once, unsupported/changed server history refuses, account switch retires reply target and edit dialog, restored history keeps identities, forged conversation/session/message targets and foreign message IDs are rejected before any write. Duplicates: setup duplicates `message-actions.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | T6 / T7 | Agent faked by assigning `LocalAgentProtocol.prototype.send/messages/listConversations/truncateMessages`. | Shared chat fixture at the agent HTTP boundary (with `failTruncate`/`holdTruncate` switches). | Medium |
| 2 | 41-47 | T6 | Two tests call `connectionController.truncateMessage` and `send` with forged targets. No UI can produce these inputs; they test the controller's trust checks. | Keep them (only coverage of the forged-target guards), grouped and named as controller guard checks in the chat journey. Move them to a Node integration test if the controller becomes importable without React. | Low |
| 3 | 36, 50 | T6 | Account change via `connectionController.offline()`. | Switch through Settings/connection UI if available in dev; otherwise keep, labelled. | Low |
| 4 | 20-51 | D8 | Each test is one very long line. | Normal formatting on move. | none |

## Proposed end state
Ten cases kept, about 8 after folding the two account-switch cases into one. They live in the reply/edit block of
`journeys/chat.spec.ts` on the same chat fixture as message actions. The two forged-target guard tests stay as an explicitly
labelled controller block.
