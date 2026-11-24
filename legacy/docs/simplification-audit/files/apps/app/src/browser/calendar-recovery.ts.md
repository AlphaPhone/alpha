# apps/app/src/browser/calendar-recovery.ts
- Lines: 9 | Role: opens the domain recovery dialog for the browser calendar document, with backup restore and salvage. | Verdict: MERGE into a domain-keyed recovery table in `browser/domain-recovery.ts` (after deleting restore)
- Importers: 3 (`browser/device-controls.tsx:7,36` dev, `prototype/calendar-adapter.ts:6,185`, `prototype/settings-adapter.ts:8,866` (legacy-recovery row) and `:877` (developer "Calendar backups")). Text/path pins: `test/browser/domain-recovery-lifecycle.spec.ts:23`, `test/browser/workflow-dialog-layout.spec.ts:11` (import `/src/browser/calendar-recovery.ts`), `scripts/storage-specs.ts:16-17`, `scripts/fixtures/calendar-adapter.ts:83`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:98`, `test/calendar-delete-latch.test.mjs:32`, `test/calendar-view-rules.test.mjs:116`, `test/calendar-sync-settings-navigation.test.mjs:92`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | A3 | `restoreOption` with `prepareCalendarBackup`/`prepareCalendarSalvage` — backup import, reachable only with test mocks (`domain-recovery.ts:9`); D3. | Delete lines 6-8 and the `calendar-backup.ts`/`revision` imports. | Low |
| 2 | 5 | D10 (P9) | Positional `openDomainRecovery(calendarDocument,'calendar','App calendar recovery','Download a backup first.',undefined,{…})` passes `undefined` to reach parameter 6. | After #1, one row `calendar:{document:calendarDocument,heading:'App calendar recovery'}` in a recovery table. | Low |
| 3 | — | A1 | Caller `settings-adapter.ts:866` exists only for `model?.status==='legacy-recovery'` (legacy calendar authority, D1). | Removed by the prototype/runtime legacy-calendar deletion. | — |

## Local types and helpers
None.

## Proposed end state
File removed; `openRecovery('calendar')` from the table. Callers in `calendar-adapter.ts` and `device-controls.tsx` updated; the two specs that import this path updated or deleted (T6).

## Verification
`test/browser/domain-recovery-lifecycle.spec.ts`, `test/browser/workflow-dialog-layout.spec.ts`, `test/browser/calendar-recovery.spec.ts`, Quint `calendar-adapter-fixture` harness.
