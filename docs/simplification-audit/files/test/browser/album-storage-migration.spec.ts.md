# test/browser/album-storage-migration.spec.ts
- Lines: 19 | Kind: Playwright spec, chromium + firefox/webkit (`scripts/storage-specs.ts:6`); 4 of 5 tests module-in-page | Verdict: MERGE into `journeys/camera-photos.spec.ts` (one case), delete the rest
- Covers: Photos album storage (`browserPhotoLibrary.changeAlbum`, `preference-documents.ts` `albumDocument`): concurrent creates, failed write, cross-tab rename refresh, legacy-key migration, recovery dialog. Duplicates: album UI steps in Photos specs (`photo-album-*`). Callers/importers: `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 12-14 | A1/D1 | Tests 1 and 4 assert the legacy localStorage key `alpha.browser.albums.v1` is migrated/refused (`exact:JSON.parse(old.snapshot.raw).legacy===raw`). | Delete with the legacy reader. | None. |
| 2 | 6-8 | P3/T6 | `IDBObjectStore.prototype.put` patch to fail a rename; no UI. | Drop, or as one journey step use a storage quota fault (CDP `Storage.overrideQuotaForOrigin`) and assert the visible name stays. | Low. |
| 3 | 9-11 | keep | Cross-tab rename refreshes the visible Albums list: real UI in tab 1 (seeded via import). | Carry into `journeys/camera-photos.spec.ts` only if multi-window rendering is a product case (owner question: Android runs one WebView). Create/rename via UI in both tabs. | Low. |
| 4 | 15-18 | D6/P7 | Album recovery is reached through "Device controls" (`browser/device-controls.tsx:40`), a dev surface; downloads exact damaged bytes. | Delete; the domain-recovery dialog is covered once in chat journey (draft recovery). | Low. |
| 5 | n/a | P8 | Runs on three engines; product ships only Android WebView. | Remove from `storage-specs.ts`. | None. |

## Proposed end state
Delete the file. `journeys/camera-photos.spec.ts` gains one album step (create, rename, reload keeps name) driven by UI; the two-tab refresh is added only if the owner confirms multi-window matters.
