# test/stopped-reply-outcome.test.mjs
- Lines: 43 | Kind: transplant (slices `export const STOPPED_REPLY_NOTICE =` .. `async function conversationList(` from `connection-ui.tsx`, evals in `vm` with fake controller state) | Verdict: REWRITE as `journeys/chat.spec.ts` case
- Covers: A Stop whose abort is unacknowledged or whose history read fails reports "Outcome unknown"; only an acknowledged abort plus a readable history says "The agent stopped this reply." Duplicates: `test/browser/local-agent-stop.spec.ts` (restart flow, not stop outcome). Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T2 | Slice of `connection-ui.tsx` (4.2k-line god module scheduled for a split). | Delete. | Low |
| 2 | 13-27 | T3 | 20 faked closure variables (`epoch`, `operation`, `conversationMemory`...). | Delete. | Low |
| 3 | 29-43 | - | Honest outcome reporting is user-visible copy with no browser coverage. | Carry both cases to the chat journey with the agent fake returning `abortTurn` = unsupported / aborted. | Med |

## Proposed end state
File deleted; two cases in `journeys/chat.spec.ts`.
