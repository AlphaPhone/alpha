# test/calendar-approval-ui.test.mjs
- Lines: 132 | Kind: mixed: unit (real `calendar-approval.ts`, `calendar-approval-fields.ts`), real module in JSDOM (esbuild bundle of `prototype/calendar-approval-review.ts`), transplant (esbuild bundle of `calendar-approval-adapter.ts` with `connection-ui`/`alpha-client` replaced by inline stubs and a fake `Shell`), plus a bundle of upstream `plugin-inbox/src/actions/choice-markers.ts` | Verdict: REWRITE as `journeys/chat.spec.ts` (Calendar review in a conversation) + MERGE parse cases into `test/integration/calendar.test.ts`
- Covers: `[CHOICE:approval-…]` markup becomes a review only when exact; the review dialog requires a fresh choice after a change, hides foreign/executing rows, disables Approve without a verified target; the chat adapter never sends a chat message, keeps drafts, honours sensitive context and late results. Duplicates: `test/browser/calendar-approval-queue.spec.ts`, `test/quint-calendar-approval-review.test.mjs`, `test/calendar-review-parse-cache.test.mjs` (same markup). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 87-91 | T2 | Adapter bundled with esbuild plugin replacing `connection-ui`/`alpha-client` with JS strings and a hand-written `Shell` class: a transplant of the monkey-patch adapter. | Delete; drive the real chat in Playwright. | None once the journey exists |
| 2 | 62-86 | T6-like (JSDOM) | Real dialog module mounted in JSDOM with `showModal` patched. Behaviour is user-visible. | Move to journey: changed request → "Updated" + second Approve; missing target → Approve disabled, Decline works; foreign row → no details; executing → no buttons; close during read; context change at tap. | Low |
| 3 | 20 | T5 | Bundles upstream `choice-markers.ts` to produce inbox markup. | In the journey, the agent fixture sends literal markup; no upstream bundle. | None |
| 4 | 13-18, 31-39 | T3 | Parser/projection tables (`calendarReviewText`, `inboxChoiceText`, `calendarApprovalFromList`). Trust boundary (agent text). | Carry as two table cases in calendar integration. | None |
| 5 | 40-61 | T3 | Field presentation with TZ/locale juggling via `process.env.TZ`. | Journey with `timezoneId` and locale shows the same fields; drop host copy. | Low |
| 6 | 120-132 | - | Device-receipt projection preserved through Calendar markup projection: cross-adapter ordering effect. | Journey case: completed device action receipt still reads correctly next to a Calendar review. | Medium (order-dependent D2 chain) |
| 7 | 62, 87 | - | Two esbuild bundles at module load. | Gone with the file. | - |

## Proposed end state
File removed. `journeys/chat.spec.ts` gets "Calendar review from agent reply" with 6-8 steps (open, changed request,
approve once, lost reply unconfirmed, draft kept, sensitive view blocked, late result after conversation switch). The
markup and list-projection tables move to `test/integration/calendar.test.ts`. The agent fixture needs a typed
approval-queue route (`harness/plugins/agent.ts`).
