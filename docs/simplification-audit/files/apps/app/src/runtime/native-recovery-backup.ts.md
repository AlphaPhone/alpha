# apps/app/src/runtime/native-recovery-backup.ts
- Lines: 16 | Role: exports an app-data recovery backup as a `.txt` through the AlphaMailAttachments document picker; throws unless test-mocks. | Verdict: DELETE (owner)
- Importers: `browser/domain-recovery.ts:24` (dynamic import inside the device-storage branch of `download`).
- Text/path pins: `test/browser/assistant-draft-storage.spec.ts`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-16 | A3 | `if(!testMocksEnabled)throw Error("App-data backup is unavailable.")` — app-data backup is excluded by the PRD ("No app-data migration, backup or import/export workflow is planned"). Production always throws, and the caller catches into "Backup unconfirmed". | Delete the file and the device-backup branch of `browser/domain-recovery.ts:18-30` (its Backup button). | Medium (owner: dev tool or delete) |
| 2 | 11 | C3 | SHA-256→hex copy. | Moot after delete (`sha256Hex` otherwise). | None |
| 3 | 3-4, 14 | C2 | inline `Saver` typing of `AlphaMailAttachments.saveReviewed`. | Moot after delete. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Backup`, `Saver` | type | 3-4 | AlphaMailAttachments typing in `prototype/inbox*` adapters | delete |

## Proposed end state
Deleted; `browser/domain-recovery.ts` keeps reset only.

## Verification
`test/browser/assistant-draft-storage.spec.ts` (drop the backup step), `npm run verify`, `audit-production-bundle.ts`.
