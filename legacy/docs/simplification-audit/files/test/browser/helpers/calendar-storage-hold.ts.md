# test/browser/helpers/calendar-storage-hold.ts
- Lines: 14 | Kind: Playwright helper (raw IndexedDB transaction hold on `alpha.browser.documents.v1`) | Verdict: **DELETE**
- Covers: holds a readwrite transaction on the browser documents store so a queued browser-calendar write waits. Duplicates: `test/browser/calendar-fixture.ts` `holdCalendarTransactions` (same DB, same store, P18). Callers/importers: `calendar-backup-restore.spec.ts` (backup, deleted by D3) and `calendar-recovery.spec.ts` (recovery of the dev browser-calendar key `alpha.browser.calendar.v1`, a test-mocks stand-in).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-14 | A3, P7, P18 | Both importers test the browser stand-in store or a feature the PRD excludes. The helper is one of two copies of the same technique. | Delete with its importers. If `calendar-recovery` is kept, merge with `calendar-fixture.ts` into `harness/storage.ts`. | Low. |
| 2 | 10 | D10 | The keep-alive key is named `calendar-recovery-transaction` but the helper is generic. | n/a (deleted). | none |

## Proposed end state
Deleted together with `calendar-backup-restore.spec.ts` and `calendar-recovery.spec.ts`.
