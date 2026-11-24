# apps/app/src/runtime/gmail-grants.ts
- Lines: 24 | Role: pure re-export of upstream `plugin-inbox/src/mailbox/grants.ts` and one type from `mailbox/types.ts`. | Verdict: DELETE
- Importers: 4 product (`prototype/inbox-cloud-adapter.ts`, `prototype/settings-adapter.ts`, `runtime/cloud-protocol.ts`, `runtime/google-connection-ui.tsx`). Text/path pins: `scripts/inbox-adapter-fixture.ts`, `scripts/test-inbox-grant-withdrawal.ts`, `scripts/test-inbox-sent-cleanup.ts`, `specs/quint/application/manifest.json`, `specs/quint/services/manifest.json`, `test/gmail-grants.test.mjs`, `test/google-calendar-connect.test.mjs`, `test/google-connection-return.test.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-24 | D4 | Whole file is `export {…} from '…/mailbox/grants.ts'`. | Importers import the upstream module directly (through the planned `@eliza/*` alias, D13); delete this file and its pins. | Low |
| 2 | 7-22 | A7 | Re-exports with 0 product users: `GMAIL_MODIFY_CAPABILITIES`, `GMAIL_READ_CAPABILITY`, `gmailActionGrant`, `requiredGmailCapability` (tests/Quint only), `GmailGrantStep`, `GmailGrantTier`, `GmailMailboxAction` (0 anywhere). | Disappear with the file. | None |
| 3 | 1-5 | A8 | "(owner decision P-37, issue #421)". | Goes with the file. | — |

## Local types and helpers
None.

## Proposed end state
File deleted; 4 product imports point at upstream `mailbox/grants.ts`.

## Verification
`test/gmail-grants.test.mjs` (tests upstream through this path: retarget or delete as T5), `scripts/test-inbox-grant-withdrawal.ts`, Quint manifests.
