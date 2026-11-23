# apps/app/src/runtime/inbox-unsaved-record.ts
- Lines: 6 | Role: pure re-export of upstream `plugin-inbox/src/mailbox/retained-draft.ts` (`encodeInboxUnsaved`, `inboxUnsavedLimit`, `readInboxUnsaved`, `InboxUnsaved`). | Verdict: DELETE
- Importers: 1 (`prototype/inbox-unsaved.ts`). Text/path pins: `scripts/test-inbox-cloud-flow.ts:14`, `scripts/test-inbox-sent-cleanup.ts:13`, `specs/quint/services/manifest.json:297,1131,1208,4115,4179`, `specs/quint/refinement/services/inbox-coordinator-ports.mjs:34`, `test/inbox-draft-copies.test.mjs:6`, `test/support/feature-parity.mjs:536`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6 | D4 / A7 | Whole body is `export {…} from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/retained-draft.ts'`. | Delete; `prototype/inbox-unsaved.ts` imports upstream directly (via `@eliza/*` alias once added). Replace this path with the upstream path in the 5 Quint `services/manifest.json` entries and `inbox-coordinator-ports.mjs:34`; repoint the two scripts and `test/inbox-draft-copies.test.mjs`; drop the `feature-parity.mjs:536` line. | Low, but every pin above must change in the same commit or `npm run verify` fails. |

## Local types and helpers
None.

## Proposed end state
File removed (0 lines).

## Verification
Quint services manifest replay (`InboxEditCoalescer`, Inbox coordinator), `test/support/feature-parity.mjs` check, Inbox unsaved-draft Playwright journeys.
