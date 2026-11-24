# test/stopped-reply-match.test.mjs
- Lines: 47 | Kind: source-text (regexes `vendor/eliza/packages/agent/src/api/conversation-routes.ts` and `connection-ui.tsx`) + unit tests of upstream `findStoppedUserTurn` from `.eliza/client-features` | Verdict: DELETE
- Covers: Stop matches its own user turn by `clientMessageId`, falling back to text and time only for rows without ids. Duplicates: `stopped-reply-outcome.test.mjs` uses the same function; upstream `conversation-turn-controller` owns it. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-20 | T1/T5 | Regexes upstream agent route source and three exact statements in `connection-ui.tsx`. | Delete. | Low |
| 2 | 22-47 | T5 | Unit tests of upstream code generated from `vendor/eliza`. | Delete; upstream follow-up if upstream lacks the identical-text case. | Low |

## Proposed end state
File deleted. `journeys/chat.spec.ts` gets one case: send the same text twice, stop the second reply, only the second turn is marked stopped.
