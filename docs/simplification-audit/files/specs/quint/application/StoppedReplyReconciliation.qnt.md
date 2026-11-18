# specs/quint/application/StoppedReplyReconciliation.qnt
- Lines: 102 | Kind: Quint model (live: manifest, 7 scenarios, 8 invariants, 3 witnesses, 10 symbol pins on `connection-ui.tsx`, `sharedSources` `packages/ui/src/api/conversation-turn-controller.ts`) | Verdict: KEEP
- Covers: after a reply is stopped, one cancel attempt, one delayed conversation read and the resulting notice; a new request, reload or agent change retires the check; a refused new request says the check never ran. Duplicates: implementation exercised by host tests `test/stopped-reply-outcome.test.mjs`, `test/stopped-reply-match.test.mjs`, `test/conversation-restore-safety.test.mjs` and Playwright `test/browser/journey-a-conversation.spec.ts` (`STOPPED_REPLY_NOTICE`); none replays the model. Callers/importers: manifest; `application/README.md`; `docs/formal-model-audit-2026-11/02-assistant.md`. No harness.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Only tie: 10 symbol pins in `connection-ui.tsx` (`scheduleStoppedReply`, `cancelStoppedReply`, four `STOPPED_*_NOTICE` constants, `STOPPED_REPLY_CHECK_MS`, `retiredStop`, …). Constants pinned by name will break on the D1 split and C6 constant moves. | Pin files, drop symbol pins. | Low |
| 2 | 7, 67 | — | `historyRevision <= schedules` and `replacedWhileBusy` are ghost state for `ChatNotReplacedWhileBusy`; fine. | None. | — |
| 3 | 26 | — | `sendStart` sets `retiredPending` from the notice before `retired()` clears it — correct ordering (reads `s.notice`, not the retired state). | None. | — |

## Proposed end state
Model unchanged; file pins instead of symbol pins. When stopped-reply logic leaves `connection-ui.tsx` as its own module, a short trace replay against it would replace the three host tests; until then `journeys/chat.spec.ts` (stop a reply, see the notice) is the implementation coverage.
