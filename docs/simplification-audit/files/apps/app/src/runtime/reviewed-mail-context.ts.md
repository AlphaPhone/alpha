# apps/app/src/runtime/reviewed-mail-context.ts
- Lines: 7 | Role: named re-export of upstream `plugin-inbox/src/mailbox/mail-context.ts`. | Verdict: DELETE (import upstream via alias)
- Importers: `prototype/inbox-cloud-adapter.ts:16`, `scripts/inbox-adapter-fixture.ts:19`.
- Text/path pins: `specs/quint/services/manifest.json`, `test/context-selection.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-7 | D4/D13 | pure shim; `MailContextDestination`, `ReviewedMailContext` re-exports have 0 users. | Point both importers, the manifest and the test at upstream; delete. | Low |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`test/context-selection.test.mjs`, `scripts/inbox-adapter-fixture.ts` consumers, Quint services manifest.
