# test/conversation-history-refresh.test.mjs
- Lines: 10 | Kind: source-text (one regex on the `send()` body of `connection-ui.tsx`; comment says "Source shape only") | Verdict: DELETE
- Covers: a reply flagged `historyRefreshRequired` sets `conversationResync` (`connection-ui.tsx:3452`). Duplicates: none; no Playwright spec mentions `historyRefreshRequired` (`git grep` in `test/browser`, `specs`: only this file). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-10 | T1 | Whitespace-tolerant regex of one statement; proves the text, not that a resync happens. | Delete. | Low |
| 2 | — | — | Behaviour (history re-read after such a reply) has no other coverage. | Add one step to `journeys/chat.spec.ts`: mock reply with `historyRefreshRequired:true`, assert the conversation list is re-read. | Low |

## Proposed end state
File deleted; one chat journey step if the owner wants the behaviour covered.
