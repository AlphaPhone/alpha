# test/chat-stop-controls.test.mjs
- Lines: 38 | Kind: transplant + template DOM (slices `out.canStopReply=` … `if (isAndroid)` from `agent-adapter.ts`, parses `template.html` in JSDOM and evaluates `sc-if` bindings by hand) | Verdict: DELETE (T4)
- Covers: while a reply is pending, composer, input bar and pill show only "Stop reply"; idle shows Send with a draft and Talk without; Stop cancels navigation then the reply. Duplicates: `test/browser/chat-continuity.spec.ts`, `chat-continuity.production.spec.ts`, `journey-core-loops.production.spec.ts`, `local-agent-stop.spec.ts` (all click "Stop reply"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | T2 | Slice of a render closure in the adapter god module. | Delete. | None |
| 2 | 13-19 | T5 | Re-implements the template engine's `sc-if` evaluation to decide visibility. | Delete. | None |
| 3 | 27 | T1 | "old header Stop does not return": a regression pin on template text. | Delete. | None |
| 4 | 28-35 | T4 | Pill surface (index 2) shows Talk even with a draft; check the chat journey asserts the pill state too. | One step in `journeys/chat.spec.ts`: type a draft with chat collapsed -> pill shows Talk, bar shows Send. | Low |

## Proposed end state
Deleted; Stop/Send/Talk visibility is asserted in the chat journey across composer, input bar and pill.
