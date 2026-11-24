# test/browser/photo-albums.spec.ts
- Lines: 30 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:7`); test 1 UI journey, tests 2-3 module-in-page calls on `browserPhotoLibrary` | Verdict: MERGE test 1 into `journeys/camera-photos.spec.ts`; DELETE tests 2-3
- Covers: create an album from a selected photo, rename, reload, remove/add membership, delete album without deleting the photo; album counts follow trash/restore/permanent delete; invalid ops and stale revisions cannot change membership. Duplicates: `photos-clean-controls.spec.ts:77-110` (same create/fill/rename/delete journey), `photo-album-accessibility.spec.ts`, `product-recovery-entry.spec.ts` (album recovery). Callers: `scripts/storage-specs.ts` (cross-browser lane).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-15 | T4 | Test 1 and `photos-clean-controls.spec.ts` test 2 are the same album journey. | Keep one (this one, which also reloads). | None. |
| 2 | 14 | T6 | End state read through `browserPhotoLibrary.albums()/list()`. | Assert "no albums" in Albums and one photo in Library. | None. |
| 3 | 16-30 | T3, T6 | Tests 2-3 call `changeAlbum`/`setTrashed`/`deletePreparedTrash` directly to check counts and revision fences of the browser development photo store. | Delete; carry "trash hides the photo from its album, restore brings it back" as one UI step. | Low: stale-revision fences of the browser store lose direct coverage (dev-only store). |
| 4 | 8-13 | D8 | Lines of 400+ characters. | Split when merging. | None. |
| 5 | — | P1 | Runs three browsers for a store the Android product does not use (native Photos). | Remove from `STORAGE_SPECS`. | Low. |

## Proposed end state
One album journey case in `journeys/camera-photos.spec.ts`: create from selection, rename, reload, remove/add, trash and restore shows/hides the photo in the album, delete album keeps the photo. Delete tests 2-3 and the file; remove from `scripts/storage-specs.ts`.
