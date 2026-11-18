# test/composer-send-ownership.test.mjs
- Lines: 152 | Kind: source transplant (six slices of `prototype/agent-adapter.ts`: `composerNeedsSizing` .. `installAgentAdapter`, `p.send`, `p.agentSay`, `planActionCard`, `replyNotices`, `sizedComposers`; compiled together and run in `vm` with a ~40-key box) | Verdict: DELETE; carry four behaviours into `journeys/chat.spec.ts`
- Covers: a send given its text reaches the transport with an empty composer and does not hold the draft; a send cut off by history reload does not clear the next send's typing indicator/status; a finished send leaves typing to a voice turn in flight; a typed message is sent even when the voice stop was never confirmed; a draft changed while waiting for the stop is not sent; composer is re-measured only when text/width/height changed. Duplicates: `test/browser/composer-dispatch.spec.ts`, `composer-send-focus.spec.ts`, `voice-composer-recovery.spec.ts`. Callers/importers: `npm test` glob; imports `support/strip-types.mjs`, real `runtime/action-message-presentation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-21 | T2 / D2 | Reassembles monkey-patched prototype methods from text; blocks the `agent-adapter.ts` split. | Delete. | Medium |
| 2 | 71-132 | - | Five send-ownership races. | Carry 87-103 (superseded send keeps the newer indicator), 113-124 (unconfirmed voice stop still sends), 125-132 (changed draft not sent) and 71-85 (send with given text) into `journeys/chat.spec.ts` (or extend `composer-dispatch.spec.ts`, which that journey absorbs). | Low |
| 3 | 133-152 | T3 | Composer measurement caching: a performance detail with a fake `scrollHeight` getter. | Drop. | None |

## Proposed end state
Deleted. Four steps in the chat journey with the agent fake holding replies: send via suggestion chip with empty composer; reload during a send then a second send keeps "typing"; voice stop rejected still sends; editing the draft while the stop is pending sends nothing.
