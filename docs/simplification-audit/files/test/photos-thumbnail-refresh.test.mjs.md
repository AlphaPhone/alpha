# test/photos-thumbnail-refresh.test.mjs
- Lines: 94 | Kind: transplant (slices `settleThumbnails`, `keepCovers`, `loadCoverThumbnails`, `setLast`, `loadLast` from `camera-adapter.ts`) + unit tests of upstream `photos-view.ts` (`readWindow`) | Verdict: DELETE (carry 2 cases into `journeys/camera-photos.spec.ts`)
- Covers: the thumbnail cache window (240 kept, 24 per native read), stale thumbnail and cover responses after a catalog, visibility, viewer or album change, the last-capture tile, and `readWindow` cursor handling. Duplicates: `test/photos-view.test.mjs` (`readWindow`, `thumbnailPlan`), `test/browser/photos-pending-read.production.spec.ts:33` ("keeps the deep window after a catalog event and reloads evicted thumbnails"), `test/browser/photos-grid-density.spec.ts`. Callers/importers: `npm test`; `test/support/strip-types.mjs`; `.eliza/client-features/packages/ui/src/mobile-shell/photos-view.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8, 15 | T2/T10 | A brace-counting slicer on `camera-adapter.ts` with a hand-built context (`libraryEpoch`, `photoReadEpoch`, `thumbFetching`, ...). | Delete. | none |
| 2 | 17-25 | T5/T4 | The two `readWindow` tests call the upstream module directly; `photos-view.test.mjs:107-118` repeats them. | Delete (upstream follow-up in the `photos-view` report). | none |
| 3 | 26-32 | T4 | Thumbnails drop beyond 240 and reload after scrolling back: the production spec covers this. | Drop. | none |
| 4 | 38-49, 65-73, 88-94 | T3 | 7+7 parameterised staleness cases (catalog, hidden, departed, read-retired, disposed, viewer, album) on epoch fences (C4). | Carry one: hold a thumbnail read, open the viewer, release, close; expect the current pixels. | low |
| 5 | 54-59 | T3 | The last-capture tile cannot be overwritten by an older read, and deleting the last camera photo clears the tile. | Carry the clear case into `journeys/camera-photos.spec.ts` (delete the last capture; the Camera tile empties). | low |
| 6 | 76-87 | T3 | Album covers survive a deep scroll. | Drop (visual; the album grid journey shows covers). | low |

## Proposed end state
File deleted. Two cases go to `journeys/camera-photos.spec.ts` (a held thumbnail read released after opening the viewer; the
last-capture tile clears). The epoch-fence logic is left to the journey and to the C4 staleness consolidation in the renderer.
