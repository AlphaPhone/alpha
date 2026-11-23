# apps/app/src/runtime/calendar-approval-client.ts
- Lines: 35 | Role: single-use Calendar approval decisions: a decision consumes one exact authenticated read of the approval queue | Verdict: KEEP (cosmetic only)
- Importers: runtime/connection-ui.tsx. Text/path pins: `test/upstream-owner-gate-compat.test.mjs:89,147-148` (reads this file's path/text), `test/calendar-approval-client.test.mjs`, `test/connection-background-restore.test.mjs`, `test/notice-owner-startup.test.mjs`, `test/private-cloud-restore.test.mjs`, `scripts/test-connection-history.ts`, quint `calendar-approval-review.mjs`, application manifest sources, feature-parity `reviewedHelpers` entry (owner connection-ui.tsx).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A7 | `CalendarApprovalConnection` exported, 0 external importers. | Unexport. | None. |
| 2 | 26 | B3 | `!['approve','reject'].includes(decision)` on a typed `CalendarApprovalDecision` parameter from in-process callers. | Drop that operand. | None. |
| 3 | 12-13 | style | Field + constructor assignment. | Parameter property `constructor(private connect: …)`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `CalendarApprovalConnection` | interface | 3-8 | connection request ports in connection-ui.tsx | keep here |

## Proposed end state
~32 lines, same behaviour.

## Verification
`test/calendar-approval-client.test.mjs`, `test/upstream-owner-gate-compat.test.mjs`, `test/quint-calendar-approval-review.test.mjs`, `test/browser/calendar-approval-queue.spec.ts`.
