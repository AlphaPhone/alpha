# test/browser/reminder-creation-storage.spec.ts
- Lines: 33 | Kind: Playwright, chromium + firefox + webkit (`storage-specs.ts:35`); tests 1-6 module-in-page (14 `/src` imports, no user action); test 7 drives the development recovery dialog | Verdict: **DELETE**
- Covers: empty reads do not create creation history; two tabs retain 20 pending creations without scheduling; failed discard keeps identity; the legacy localStorage archive is preserved byte-for-byte; a stale recovery capture cannot erase a newer request; an older tab's legacy write cannot overwrite canonical requests; unreadable history offers backup + reset (dev only). Duplicates: same shapes as `reminder-action-storage.spec.ts` and `reminder-storage-migration.spec.ts`; stale-reset guard is the generic `BrowserDomainDocument` behaviour, also covered by `domain-*` specs (other chunks). Callers/importers: `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-19, 23-25 | A1 | "legacy archive preserves exact bytes" (3 tests) and "older tab changing the legacy copy" test the localStorage → domain-document import, which is deleted (C6, D1). | Delete with the reader. | none |
| 2 | 5-7, 14-16, 20-22 | T6 / T3 | Empty-read, failed-commit (patches `IDBObjectStore.prototype.put`) and stale-reset are unit tests of the store, run in three browsers. | Delete. | Low |
| 3 | 8-13 | – | Two-tab retention. | Covered by the single cross-tab step proposed in `journeys/reminders.spec.ts` (see `reminder-action-storage.spec.ts.md`). | Low |
| 4 | 26-33 | D6 / A1 | Recovery dialog is development-only (`domain-recovery.ts:9`) and is seeded through the legacy localStorage key. | Delete; one dev recovery check suite-wide in `journeys/dev-surface.spec.ts`. | none |

## Proposed end state
File and `storage-specs.ts` entry deleted. The cross-tab retention guarantee lives in one reminders journey step.
