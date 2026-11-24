# apps/app/src/browser/calendar-backup.ts
- Lines: 82 | Role: parse and salvage an exported calendar backup file into fresh events for the recovery dialog's "restore" option. | Verdict: DELETE
- Importers: 1 (`browser/calendar-recovery.ts:3`). Text/path pins: `test/support/feature-parity.mjs`; behaviour covered by `test/browser/calendar-backup-restore.spec.ts` and `test/browser/calendar-recovery.spec.ts` (both listed in `scripts/storage-specs.ts:16-17`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-82 | A3 | Backup import/restore. `domain-recovery.ts:9` `if(!testMocksEnabled){openRetainedDataNotice(heading,signal);return;}` — the restore dialog never opens in a product build. PRD: "No app-data migration, backup or import/export workflow is planned"; DECISIONS D3: delete. | Delete the file, the `restoreOption` in `calendar-recovery.ts`, the `RestoreOption` branch and calendar-specific copy in `domain-recovery.ts` (P9), `test/browser/calendar-backup-restore.spec.ts`, the restore parts of `test/browser/calendar-recovery.spec.ts`, and the two entries in `scripts/storage-specs.ts`. | Low (test-mocks only) |
| 2 | 10 | A1 | `if(value?.version===1&&typeof value.value==='string')` unwraps the domain-document envelope — tied to the legacy envelope (P2). | Goes with the file. | — |
| 3 | 3, 37 | C6 | Occurrence id grammar `/^(.*):occ:(-?\d+)$/` and `` `${id}:occ:${begin}` `` duplicate `calendar-records.ts:8` / `calendar-recurrence.ts:29`. | Goes with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `encodedSeriesId` | helper | 2-5 | `calendar-records.ts:8` regex | delete |
| union-find `root/join` | helper | 51-52 | none | delete |

## Proposed end state
File removed.

## Verification
`npm run verify` (typecheck, feature-parity list edit), `scripts/storage-specs.ts` list, production bundle audit.
