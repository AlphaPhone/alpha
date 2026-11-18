# test/browser/reminder-storage-migration.spec.ts
- Lines: 46 | Kind: Playwright, chromium + firefox + webkit (`storage-specs.ts:17`); tests 1-5 module-in-page on `BrowserDaily` + `reminderDocument` (11 `/src` imports); test 6 drives the development recovery dialog | Verdict: **DELETE**
- Covers: polling an empty or unchanged store does not rewrite it; two tabs retain 20 scheduled reminders; a failed transaction keeps the reminder and receipts together; the legacy `alpha.browser.reminders.v1` localStorage copy is imported byte-for-byte and later older-tab writes are refused; a stale reset cannot erase a newer reminder; damaged reminders offer backup + reset (dev only). Duplicates: same shapes as `reminder-creation-storage` and `reminder-action-storage`; stale-reset is generic `BrowserDomainDocument` behaviour. Callers/importers: `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-36 | A1 | "legacy migration preserves exact bytes and refuses later older-tab writes" is the localStorage import being deleted (C6, D1). | Delete with the reader. | none |
| 2 | 4-12, 19-28, 37-39 | T6 / T3 | Identity-preservation, failed-transaction (patches `IDBObjectStore.prototype.put`) and stale-reset are store unit tests run in three browsers. | Delete. | Low |
| 3 | 13-18 | – | Two-tab scheduling. | Covered by the single cross-tab step in `journeys/reminders.spec.ts`. | Low |
| 4 | 40-46 | D6 / A1 | Dev-only recovery dialog, seeded via the legacy localStorage key. | Delete; one dev recovery check suite-wide. | none |
| 5 | name | D11 | The file name says "migration" though most tests are not. | Gone. | none |

## Proposed end state
File and storage list entry deleted.
