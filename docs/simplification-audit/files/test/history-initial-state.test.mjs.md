# test/history-initial-state.test.mjs
- Lines: 49 | Kind: transplant (slices `var BASE`/`class Component` from `prototype/model.js`, the constructor from `dc-lite.js`, a history callback and `attachmentKey` from `agent-adapter.ts`, `mergeConversationDelivery` from `connection-ui.tsx`; strips types and runs them in `vm` with a fake React base) | Verdict: DELETE
- Covers: restored chat history and delivered replies merge into the shell's message list without losing a newer delivery or the draft, and never cross an owner/room change; saved transcript attachments are restored through the owner/room-scoped store. Duplicates: `test/browser/chat-continuity.production.spec.ts`, `conversation-selection-storage.spec.ts` (history restore), `chat-system-notices.spec.ts`. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-15 | T2 | Five marker slices across four of the largest files (`'      syncStoppedReplyNotice('`, `'const actionReceipts ='`, `'const preDispatchRefusals='`). Blocks the `model.js` / `agent-adapter.ts` / `connection-ui.tsx` splits (D1). | Delete. | Low |
| 2 | 18-22 | D7 | Requires a vm context with `QUICK_SETTINGS`, `ALPHA_PRODUCT`, a fake `browserDocuments`: a re-creation of the shell, not the shell. | — | — |
| 3 | 26-49 | — | Owner-change and room-change races are real. | Carry to `journeys/chat.spec.ts`: (a) open a saved conversation while a reply arrives: both messages shown, draft kept; (b) switch account while history is loading: the old owner's messages never appear; (c) a saved transcript attachment is restored on reopen. | Medium: (b) has no browser case found |

## Proposed end state
File deleted. Three cases in `journeys/chat.spec.ts` on the resident stub (delayed history response, then session
switch).
