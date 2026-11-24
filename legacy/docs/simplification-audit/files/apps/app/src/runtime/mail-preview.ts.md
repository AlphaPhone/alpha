# apps/app/src/runtime/mail-preview.ts
- Lines: 2 | Role: one-line re-export of upstream `decodeMailPreview` (`plugin-inbox/src/mailbox/preview.ts`). | Verdict: DELETE
- Importers: 1 (`prototype/inbox-cloud-adapter.ts`). Text/path pins: `scripts/inbox-adapter-fixture.ts:6`, `test/mail-preview.test.mjs:4` (tests the upstream function, T5), `test/support/feature-parity.mjs:550`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D4 / A7 | `export { decodeMailPreview } from '../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/preview.ts';` | Delete; `inbox-cloud-adapter.ts` and `scripts/inbox-adapter-fixture.ts` import upstream directly; delete `test/mail-preview.test.mjs`; drop `feature-parity.mjs:550`. | None. |

## Local types and helpers
None.

## Proposed end state
File removed.

## Verification
Inbox list Playwright journeys (snippet rendering); `npm run verify`.
