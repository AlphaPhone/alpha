# test/browser/reminder-action-storage.spec.ts
- Lines: 24 | Kind: Playwright, chromium + firefox + webkit (listed in `scripts/storage-specs.ts:31`); tests 1-3 are module-in-page (8 `/src` imports, no user action) over the upstream `createReminderActionJournal` and `reminderActionDocument`; test 3 monkey-patches `Capacitor.getPlatform` and `secureConnectionStore`; test 4 drives the development recovery dialog | Verdict: **DELETE**; carry the two-tab case into `journeys/reminders.spec.ts` (storage step)
- Covers: pending reminder actions (cancel/complete/snooze/update) written from two tabs all survive without replay; a failed or stale discard keeps the exact pending action; on Android the journal uses the secure compare-exchange slot `reminder-deletions:v1:device`; unreadable history offers backup download and reset. Duplicates: journal semantics are upstream (`plugin-assistant/.../reminder-journal.ts`, T5); the two-tab pattern repeats in `reminder-creation-storage` and `reminder-storage-migration`; the recovery dialog repeats in both of those too. Callers/importers: `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | T6 / T5 | Tests 1-3 call journal functions directly; test 2 patches `IDBObjectStore.prototype.put`; test 3 fakes Android by patching `getPlatform` and the secure store. They test upstream journal logic and a browser document, not a user journey. | Delete. The Android slot path is native; the journal is upstream. | Low |
| 2 | 19-23 | D6 / A1 | Test 4 corrupts the legacy localStorage key `alpha.browser.reminder-deletions.v1` (the domain document's legacy import source) and drives the backup/reset dialog. That dialog only exists with `testMocksEnabled` (`domain-recovery.ts:9`); production shows the retained-data notice instead. Seeding via localStorage stops working when the legacy import is deleted (C6). | Delete. One development recovery check is enough suite-wide (keep it in `journeys/dev-surface.spec.ts`, seeded by corrupting the IndexedDB record). | Low |
| 3 | 7-11 | – | Two tabs retaining pending actions without replay is a real cross-tab guarantee. | Carry as one step in `journeys/reminders.spec.ts` that both tabs reach through UI (approve a reminder action in each). Keep it in the cross-browser storage list. | Low |

## Proposed end state
File deleted; `storage-specs.ts` loses the entry. The reminders journey has one cross-tab storage step covering creations, actions
and scheduled reminders together (replacing the three per-store two-tab tests).
