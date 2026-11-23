# apps/app/src/runtime/gmail-read-ahead.ts
- Lines: 2 | Role: one-line re-export of upstream `GmailReadAhead`. | Verdict: DELETE
- Importers: 1 product (`prototype/inbox-cloud-adapter.ts`). Text/path pins: `scripts/inbox-adapter-fixture.ts`, `scripts/test-gmail-read-ahead.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D4 | `export { GmailReadAhead } from '…/mailbox/read-ahead.ts'` (research P10 shim). | `inbox-cloud-adapter.ts` imports upstream directly; update the two scripts; delete file and feature-parity entry. | None |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`scripts/test-gmail-read-ahead.ts`, inbox journeys.
