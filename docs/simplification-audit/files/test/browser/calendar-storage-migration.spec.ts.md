# test/browser/calendar-storage-migration.spec.ts
- Lines: 83 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:8`), 8 tests + 2 loops (14 runs ×3); module-in-page against `BrowserCalendar`/`calendarDocument` with IndexedDB holds (s20 r7, 1 sleep) | Verdict: DELETE
- Covers: (1) the legacy localStorage calendar is imported byte-exact into the document store; (2-8) stand-in races: cancelling or backgrounding while a read is queued presents nothing; dismissing the modal editor/response aborts the write; reads and Undo polling keep the receipt; empty queries create no data before an agent source is requested. Duplicates: test 2 ≈ `calendar-agent-transaction-cancel.spec.ts`; tests 4 ≈ `calendar-transaction-cancel.spec.ts`; generic document atomicity in `domain-atomicity.spec.ts`, `domain-initialization.spec.ts`. Callers/importers: chromium; `scripts/storage-specs.ts:8`; imports `calendar-draft-readiness.ts`, `calendar-fixture.ts` (its only importer).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-19 | A1 (D1) / P8 | Legacy import test: seeds `alpha.browser.calendar.v1` in localStorage and asserts migration. | Delete with the legacy reader. | None |
| 2 | 21-74 | T6 / P7 | Every other case drives `new BrowserCalendar().executeAgent/edit/editResponse/editSeries/removeSeries/joinMeeting/open` directly, dispatches `alpha:device-state`/`launcher-home` events and inspects `calendarDocument.capture()`. No user path. | Delete. | Medium: "Home during a queued read presents nothing late" (5 variants) and "dismiss aborts the IndexedDB write" lose their only coverage in the web stand-in. |
| 3 | 46 | P3 | `IDBObjectStore.prototype.put` patched to click Cancel mid-transaction. | n/a | None |
| 4 | 63 | T8 | `waitForTimeout(2000)` to watch a 500 ms poll. | n/a | None |
| 5 | 8-9, 76 | — | Routes a fake `/__storage-fixture` page to import modules without the app. | n/a | None |
| 6 | — | T4 | Three engines × 14 runs. | n/a | None |

## Proposed end state
File deleted; `scripts/storage-specs.ts` loses line 8; `calendar-fixture.ts` deleted with it. If the owner wants the "Home cancels a late Calendar presentation" guarantee kept, add one UI case to `journeys/calendar.spec.ts`: hold the storage transaction (harness), tap an event, press Home, release, assert no dialog.
