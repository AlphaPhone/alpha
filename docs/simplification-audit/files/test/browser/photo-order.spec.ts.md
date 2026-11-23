# test/browser/photo-order.spec.ts
- Lines: 60 | Kind: Playwright, chromium; seeds a hand-built version-1 IndexedDB (`alpha.browser.photos.v1`, 125 rows plus an edit receipt), then module-in-page paging calls and one UI scroll | Verdict: REWRITE as one case in `journeys/camera-photos.spec.ts`; delete the legacy seed
- Covers: newest-first paging by capture date with stable id ties (40-row pages, no gaps or duplicates), filter counts (favorites/videos/trash/custom album), a page boundary that survives deletion and newer captures, malformed cursors refused, and grid infinite scroll with no Load more. Duplicates: `photos-pending-read.production.spec.ts:33-68` (deep paging by scroll on the native path), `test/browser-camera-storage.test.mjs` (upgrade moves video bytes). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-15 | A1 (C6) | Every test starts from a version-1 database and relies on `browser-camera.ts:36-45` upgrading it to v3 (index creation, video bytes split). `delete-candidates.md` C6 lists the `browser-camera.ts` v2→v3 cursor as a legacy reader to delete; README/PRD: no app-data migration. | Seed through the current store (`importBrowserPhoto` with controlled dates, or a harness seed that writes v3 rows). | Medium: the seed helper must set capture dates. |
| 2 | 19-25, 43-60 | T3, T6 | Paging, filter and cursor checks call `browserPhotoLibrary.list({before})` directly. | Delete tests 2-3; keep the ordering assertion through the grid. | Low: browser development store loses cursor-fence coverage. |
| 3 | 26-40 | — | The grid part (day header counts 40→80→120, last tile is the oldest, no Load more) is a real journey. | Keep, seeded with 120 current rows. | None. |
| 4 | 12 | A1 | The `edit:receipt` row only matters for the legacy upgrade. | Drop. | None. |

## Proposed end state
One case: seed 120 photos/videos with tied dates through the current store, open Photos, scroll to the end; header counts grow 40/80/120, tile order is newest-first with stable ties, no Load more; after reload the first tile is unchanged. Delete the v1 seed and the module-level tests.
