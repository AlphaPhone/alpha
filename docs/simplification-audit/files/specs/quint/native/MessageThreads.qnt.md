# specs/quint/native/MessageThreads.qnt
- Lines: 155 | Kind: Quint model (live) | Verdict: KEEP
- Covers: one SMS thread: unread counting and read-on-open, owner draft never overwritten, agent suggestion only into an empty composer for the latest unanswered message and never re-offered after dismissal, owner-asked draft, every send needs an owner tap and native review of the exact text, an unknown outcome is never re-sent. Duplicates: `test/message-draft.test.mjs` (host unit test of the same pure transitions in `message-draft.ts`, T3); radio dispatch itself is `NativeSmsDispatch.qnt`. Callers/importers: `quint:check` (14 runs); `refinement/native/telephony.mjs:32-83` (`checkTelephonyMessageThreads`, esbuild bundle of `apps/app/src/runtime/message-draft.ts`), run from `refinement/native/index.mjs:171`; obligation `index.mjs:217`; doc comments in `message-draft.ts:3`, `sms-adapter.ts:49`, `telephony-executor.ts:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — (good) | Bundles and calls the real `message-draft.ts` exports. | Keep. | — |
| 2 | test duplication | T3 / T4 | `test/message-draft.test.mjs` unit-tests the same draft/suggestion functions the replay already drives through 14 scenarios plus random traces. | Delete the host unit test (D10), keeping any case that has no model scenario (check: none expected beyond formatting). | Low |
| 3 | manifest `sources` | T10 | `apps/app/src/prototype/sms-adapter.ts` and `apps/app/src/runtime/image-sms.ts` pinned but not executed (obligation says thread reads/read state are the SMS adapter's job). | Trim to `message-draft.ts`. | Low |
| 4 | 13 | — | Older `check(condition)` style. | Optional `.expect`. | None |
| 5 | 84-91 | — | Uncertain-send branch is explicit and well commented. | None. | — |

## Proposed end state
Model and esbuild replay unchanged; sources trimmed to `message-draft.ts`; `test/message-draft.test.mjs` deleted as
duplicate coverage. Thread rendering/read-state UI remains a `journeys/inbox.spec.ts` (messages) concern on the AOSP
fixture.
