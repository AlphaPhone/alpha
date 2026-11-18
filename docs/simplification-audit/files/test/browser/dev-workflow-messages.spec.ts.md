# test/browser/dev-workflow-messages.spec.ts
- Lines: 17 (7.8 KB) | Kind: Playwright, chromium; local workflow simulator "New messages" read + "reply to the sender" send over simulator Messages | Verdict: DELETE
- Covers: simulator selects unread incoming messages without marking them read, sender filtering, ambiguous/deleted sender refusal, replay-bound reply receipts, unread-count consistency. Duplicates: none outside the simulator. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | P7 | Dev-only executor over `alpha.dev.app.messages`; `workflow-local-send.ts` is imported only by `simulated-workflows.ts`. | Delete with the simulator. | Low. |
| 2 | 10 | T6 | `sendWorkflowLocal` replayed in-page to test receipt binding. | Gone. | None. |
| 3 | 7-9 | — | Uses the simulator's "Development result" dialog to supply the draft reply. | Gone. | None. |

## Proposed end state
Deleted with the simulator. Product reply-to-sender actions run on the resident agent and are covered by approval journeys (`journey-f-reviewed-send.spec.ts`).
