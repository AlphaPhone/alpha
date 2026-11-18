# test/browser/browser-photo-edit.spec.ts
- Lines: 198 | Kind: Playwright spec, chromium + firefox/webkit (`scripts/storage-specs.ts:30`), 12 tests (+loop); 5 UI tests, 7 module-in-page or prototype-patched | Verdict: MERGE into `journeys/camera-photos.spec.ts` (UI cases), DELETE the library-level tests
- Covers: photo editor rotate/crop/filter saves a distinct copy with original pixels unchanged; lost reply/receipt recovery; suspended save retired by another tab; unchanged edits create nothing; interrupted commit rolls back; transform parameters captured before async work; durable admission before dispatch; late read after Home; Replace original in place; discard/replace confirmations; viewer zoom/pan/pinch/keyboard; agent photo selection with missing ids. Duplicates: photos viewer specs in other chunks. Callers/importers: `scripts/storage-specs.ts`; imports `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-19 | P2 | Seeds by writing a raw row into `alpha.browser.photos.v1` IndexedDB (browser stand-in schema). | Seed through the photos bridge stub (`helpers/photos-bridge.ts`) or a camera capture. | Medium. |
| 2 | 47-121 | T6/P3 | Five tests drive `browserPhotoLibrary.beginEdit/saveEdit/editResult` and patch `saveEdit`, `HTMLImageElement.prototype.decode`, `IDBObjectStore.prototype.put`. They test the browser library's receipt machinery. | Delete. | Medium: lost-reply/no-duplicate-copy recovery loses coverage. |
| 3 | 122-139 | P3 | `browserDocuments.edit/read` patched to hold admission/read. | Delete (internal ordering). | Low. |
| 4 | 192-198 | T6 | Agent selection via `deviceLibraryAgent().runView` import. | Drive from the composer with the resident stub returning `photo_library_select`, or drop. | Low. |
| 5 | 26-46 | keep | UI edit-and-save-copy; pixel check reads the saved copy back via the library (acceptable read-back, or via Save file download). | Carry. | None. |
| 6 | 140-190 | keep | Replace original, discard/replace dialogs, viewer zoom/keyboard/pinch. | Carry. | None. |
| 7 | n/a | P8 | Three engines. | Remove from `storage-specs.ts`. | None. |

## Proposed end state
Four steps in `journeys/camera-photos.spec.ts`: edit → save copy (original unchanged), Replace original with confirmation, discard dialog, viewer zoom/pan/keyboard. Library-level receipt/race tests deleted.
