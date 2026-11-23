# test/chat-transcript-window.test.mjs
- Lines: 96 | Kind: transplant in JSDOM (string-rewrites `dc-lite.js` imports, slices `CHAT_CLOSED_ROWS` and `transcriptWindow(`…`getSnapshotBeforeUpdate(` from `model.js`, mounts a fake Shell with React) | Verdict: REWRITE as `journeys/chat.spec.ts` step (long conversation)
- Covers: a closed chat renders only the newest 20 rows, an open one the newest 100; scrolling to the top grows the window by 100 up to the whole conversation; a new conversation starts over. Duplicates: none found that seeds 300 messages (`chat-continuity.spec.ts` checks row identity, not windowing). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-26 | T2 | Rewrites three import lines of `dc-lite.js` and slices two regions of `model.js`; breaks with the `model.js` split. | Delete. | None |
| 2 | 13-17 | C3 | Global JSDOM install without restore (pollutes the test process when run with `--test-isolation=none`). | Gone with the file. | None |
| 3 | 52-96 | T3 | Real performance behaviour of a 300-message history; no other coverage. | `journeys/chat.spec.ts`: dev agent restores a 300-message conversation -> 20 rows collapsed, 100 open, scroll to top twice -> first message visible. | Low |

## Proposed end state
Deleted after the chat journey gains the long-conversation step (needs a dev-agent fixture with N messages).
