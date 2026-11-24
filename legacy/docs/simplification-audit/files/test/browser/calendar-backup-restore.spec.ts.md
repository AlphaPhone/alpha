# test/browser/calendar-backup-restore.spec.ts
- Lines: 77 | Kind: Playwright, chromium + firefox + webkit (in `scripts/storage-specs.ts:14`), 10 tests (30 runs); UI over the test-mocks "Calendar recovery" dialog (s4 r63) | Verdict: DELETE
- Covers: choosing, reviewing and confirming a calendar backup restore; refusing unsupported/coerced backups; partial salvage; stale-capture conflicts; Settings → Apps → Calendar "Calendar backups" entry. Duplicates: restore parts of `calendar-recovery.spec.ts`. Callers/importers: chromium project; `scripts/storage-specs.ts:14` (firefox/webkit); imports `helpers/calendar-storage-hold.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-77 | A3 (D3) | Backup import/restore. `domain-recovery.ts:9` returns the retained-data notice unless `testMocksEnabled`; `calendar-backup.ts` is marked DELETE in its report. PRD: no backup/import/export. | Delete the spec with `calendar-backup.ts`, the restore option in `calendar-recovery.ts`, the "Calendar backups" developer row in `settings-adapter.ts:870`, and the `storage-specs.ts` entry. | None |
| 2 | 4 | A1 | Seeds `'damaged original'` into the legacy localStorage key. | Goes with #1. | None |

## Proposed end state
File deleted; `scripts/storage-specs.ts` loses line 14; `helpers/calendar-storage-hold.ts` keeps one importer fewer.
