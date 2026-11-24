# test/system-notice-collapse.test.mjs
- Lines: 105 | Kind: unit (esbuild bundle of real `runtime/action-message-presentation.ts`) + transplant (tests 7-8 slice `connection-ui.tsx`) + source-text (test 9) | Verdict: REWRITE as cases in `journeys/chat.spec.ts`
- Covers: repeated upstream "needs attention" system notices in chat history collapse to at most the latest one, worded for whether the owner was waiting, retired by a later real reply, and never rewriting stored bytes. Duplicates: `test/browser/chat-system-notices.spec.ts` (collapse + combined notice, 2 tests) and its `.production.spec.ts` twin. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-24 | T3 (tautology) | `UPSTREAM_*_NOTICE` is defined as `systemNoticeText(...)` (`action-message-presentation.ts:103`), so equality with `systemNoticeText` re-checks the definition; it also reads `vendor/eliza/...system-notice.ts` while product imports `.eliza/...`. | Delete. | none |
| 2 | 26-44 | T1-like | Copy assertions by regex (`/host|diagnostics|—/`, `/Send again/`). | Keep only the visible wording check in the journey. | none |
| 3 | 81-97 | T2 | Slices `restoredMessages` and `mergeConversationDelivery` out of `connection-ui.tsx` with `indexOf`, regex-removes type annotations and evals with stubs. | Delete; behaviour goes to the reload journey. | none |
| 4 | 99-105 | T1 | Regexes `connection-ui.tsx` and `agent-adapter.ts` for exact call shapes. | Delete. | none |
| 5 | 46-79 | T3 | The collapse cases are the real value. | Carry into the journey (below). | low |

## Proposed end state
File deleted; `chat-system-notices.spec.ts` (+ production twin) merges into `journeys/chat.spec.ts` with the fake agent
seeding history. Cases worth carrying: (a) four identical notices then a normal reply, after reload, shows no notice;
(b) notices after an unanswered message show one "Send again" notice, background notices show the calm wording;
(c) a notice before a new send is never worded as that send's failure; (d) streaming/interrupted/card/device-receipt rows
do not retire a notice; (e) a reload keeps an interrupted reply marked unfinished with its notice.
