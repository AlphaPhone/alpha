# test/browser-camera-storage.test.mjs
- Lines: 202 | Kind: integration-with-fakes (esbuild-bundles the real `apps/app/src/prototype/browser-camera.ts` with 9 imports replaced by inline stub modules, runs it in `vm` against a 60-line hand-written IndexedDB double with cursors, a compound index and transaction rollback) | Verdict: REWRITE as `journeys/camera-photos.spec.ts` cases; DELETE the IndexedDB double
- Covers: a recording's bytes are stored in a separate `video-data` store and listing, counts, albums, favourites and file entries never read them; a saved video copy and its permanent deletion keep row and bytes together; photo-edit receipts are kept while an outcome can still be asked for and swept when abandoned; capture refuses after the camera track ends; rows from an earlier version are moved on upgrade. Duplicates: `test/browser/browser-camera.spec.ts` (3 tests, real Chromium IndexedDB, persists a frame and restores Photos after reload), `browser-photo-edit.spec.ts`, `camera-media.production.spec.ts`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-63 | T5, T3 | A home-built IndexedDB (key ordering, ranges, cursors, aborts). The test's correctness depends on this double matching browser semantics; Chromium in Playwright gives the real thing. | Delete. | — |
| 2 | 66-80 | T2 | An esbuild plugin throws on any unreviewed import and replaces 9 modules with inline strings. Every new import of `browser-camera.ts` breaks the test. | Delete. | — |
| 3 | 131-144 | A1 | "recordings stored inside their rows by an earlier version are moved on upgrade" covers the v2→v3 migration in `browser-camera.ts:41-45` (`// Earlier versions stored each recording inside its row`). The package starts with empty private data (D1). | Delete the case, and report to the `browser-camera.ts` reviewer: drop the cursor migration and keep only store and index creation. | Low |
| 4 | 99-111 | T3 | Pure-rule assertions on `splitVideoRow`, `editReceiptAbandoned`, `editReceiptSettled`. | Delete; covered through the journeys below. | — |
| 5 | 113-201 | — | Worth carrying to `journeys/camera-photos.spec.ts` (chromium, test-mocks): (a) record a clip, reload, Photos lists and plays it; (b) save an edited video copy, trash it, empty trash: the original still plays; (c) close the photo editor without saving and reopen: no stale outcome; (d) end the camera track: capture shows "Camera is not ready" and nothing is saved. The "list never reads bytes" rule is a performance property; check it with one `page.evaluate` IndexedDB read count only if the owner wants it. | REWRITE. | Med |

## Proposed end state
File deleted. Four camera/photos journey cases on the real browser IndexedDB, using the existing camera bridge fakes from `browser-camera.spec.ts`. The legacy in-row recording migration is removed from `browser-camera.ts`.
