# test/browser/calendar-recovery.spec.ts
- Lines: 35 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:15`), 7 tests (×3); UI over the test-mocks recovery dialog with a broken legacy localStorage value (s7 r29) | Verdict: DELETE
- Covers: a damaged legacy `alpha.browser.calendar.v1` value offers "Recover browser calendar": backup download preserves the bytes, reset needs confirmation, stale tabs invalidate the reset, held/failed transactions keep the original, reset renews the agent source revision, and works without Web Locks. Duplicates: restore half in `calendar-backup-restore.spec.ts`; `domain-recovery-lifecycle.spec.ts` covers the generic dialog. Callers/importers: chromium; `scripts/storage-specs.ts:15`; imports `helpers/calendar-storage-hold.ts`, `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | A1 (D1) | Precondition is a broken value under the legacy localStorage key, read only by the legacy reader in `calendar-store.ts:11`; nothing in the product writes that key. | Delete with the reader. | None |
| 2 | 7-10 | A3 (D3) | Backup download and reset exist only in test-mocks builds (`domain-recovery.ts:9`). | Delete. | None |
| 3 | 26 | T6 | "reset renews authority" calls `calendarDocument.reset` and `prepareAgentSource` in page. | n/a | None |
| 4 | 23 | P3 | `IDBObjectStore.prototype.put` overwritten without restore. | n/a | None |

## Proposed end state
File deleted; `scripts/storage-specs.ts` loses line 15. If the owner keeps any current-format recovery, `domain-recovery-lifecycle.spec.ts` is the single home.
