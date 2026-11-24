# apps/app/src/runtime/calendar-approval.ts
- Lines: 62 | Role: Calendar approval contract on the client: id/paths, `[CHOICE:approval-…]` markup removal, inbox CHOICE removal, queue row parsing, status copy and resolution receipt parsing | Verdict: SIMPLIFY (move `inboxChoiceText` and the CHOICE parsing to the shared chat-markup module)
- Importers: prototype/calendar-approval-adapter.ts, prototype/calendar-approval-fields.ts, prototype/calendar-approval-review.ts, runtime/calendar-approval-client.ts, runtime/connection-ui.tsx. Text/path pins: `test/upstream-owner-gate-compat.test.mjs:13,90,149` (imports + reads path), `test/calendar-approval-ui.test.mjs`, `test/calendar-review-parse-cache.test.mjs`, `test/calendar-approval-client.test.mjs`, `test/quint-calendar-approval-review.test.mjs`, `test/browser/calendar-approval-queue.spec.ts`, `scripts/test-connection-history.ts`, quint `calendar-approval-review.mjs`, `refinement/application/index.mjs`, application manifest sources, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-29 | D11 | `inboxChoiceText` (inbox draft/thread CHOICE blocks) has nothing to do with Calendar approvals. | Move to the shared chat-markup module (see action-message-presentation report). | Low. |
| 2 | 6-17, 22-27 | C3/C5 | Two more hand-written `[CHOICE:…]` parsers (approval and inbox) next to check-in and Maps-share ones in action-message-presentation.ts. | `parseChoiceBlocks(text, kind)` once; keep each acceptance rule. | Medium: port tests first. |
| 3 | 3-4 | C3 | UUID pattern string + `new RegExp('^'+uuid+'$','i')` compiled on every `calendarApprovalId` call; twins google-accounts.ts:52, local-agent.ts:183, resident-recovery.ts:33, action-message-presentation.ts:10. | Shared `UUID` regex/source in `lib/`; compile once. | None. |
| 4 | 34 | C3 | `object` plain-object guard. | Shared `isRecord`. | None. |
| 5 | 28 | C3 | `\n{3,}` collapse + trim. | Shared `tidyAfterRemoval`. | None. |
| 6 | 40 | D8/B3 (keep) | 560-char row validator of the network queue response (trust boundary). | Keep; split into named checks. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `uuid` | const | 3 | google-accounts.ts:52, local-agent.ts:183, resident-recovery.ts:33, device-view-profile.ts:4 (v4-only), browser/development-workflows.ts:58 | `lib/uuid.ts` |
| `object` | helper | 34 | ~35 copies | `lib/is-record.ts` |
| `reviewPattern` | const | 6 | CHOICE parsers in action-message-presentation.ts | chat-markup |
| `fallback` copy map | const | 57 | none | keep |

## Proposed end state
~45 lines of approval-only code (ids, paths, row/receipt parsing, status copy, approval CHOICE via shared parser); inbox CHOICE moves out. Copy unchanged.

## Verification
`test/calendar-approval-ui.test.mjs`, `test/calendar-review-parse-cache.test.mjs`, `test/upstream-owner-gate-compat.test.mjs`, `test/quint-calendar-approval-review.test.mjs`, `test/browser/calendar-approval-queue.spec.ts`.
