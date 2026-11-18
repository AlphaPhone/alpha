# test/browser/photo-batch.spec.ts
- Lines: 173 | Kind: Playwright, chromium; mix of UI journeys and module-in-page calls on `browserPhotoLibrary`, with `fetch`, `IDBObjectStore.prototype.put`, `HTMLAnchorElement.prototype.click` and React-fiber patches; spawns `python3` to read a zip | Verdict: MERGE about 5 cases into `journeys/camera-photos.spec.ts`; DELETE the store-level cases
- Covers: batch favorite/trash/undo/download persists exactly the selected items and the zip holds their bytes; invalid/duplicate batch requests and stale items; a storage abort rolls back the batch; stale share selections download nothing; compact light/dark layouts keep batch controls above the pill; Cancel selection returns to Library and Albums has no Select; Share (Web Share) is separate from Save file for single/batch × supported/unavailable/cancelled; share/save recheck revisions after async blob preparation; a pending share/save is retired by Back/Home/hidden; a library refresh keeps the Share panel and a changed selection closes it; declining a 45-item delete stops after one confirmation. Duplicates: `photo-permitted-batch.spec.ts` (native batching/decline), `photos-clean-controls.spec.ts` (Files share of photos). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | P3, T9 | Zip verified by `execFileSync('python3', ...)` with inline Python; the hashes are computed in page with `crypto.subtle`. | Read the zip in Node (a small central-directory reader or a dev dependency already present); drop the Python dependency from the browser suite. | Low. |
| 2 | 17-33 | T3, T6 | Tests 2-4 call `changeMany`/`shareMany` directly and patch `IDBObjectStore.prototype.put` to check request validation, conflicts and rollback of the browser development store. | Delete. | Low: dev-only store fences lose direct coverage; the native path is `photo-permitted-batch`. |
| 3 | 87-98 | T6 | Revision recheck after async blob prep is done by calling `shareMany`/`saveBrowserMedia` with a patched `window.fetch`. | Delete; test 10 covers the user-reachable race. | Low. |
| 4 | 126-144 | T6, T8 | Walks `__reactContainer$` fibers to find the shell and call `vset('photos', ...)`; then `waitForTimeout(600)`. | Trigger a refresh through a real capture/import (seed another photo) and wait on the panel; drop the fiber walk. | Medium. |
| 5 | 62-85 | T7 | 6 variants (single/batch × 3 outcomes). | Keep batch × {supported, unavailable} and single × cancelled (3). | Low. |
| 6 | 100-124 | T7, T6 | 6 variants (share/save × back/home/hidden) with fetch, anchor-click and `document.hidden` patches, plus a probe `changeMany` call as a settle barrier. | Keep save × back and share × hidden; replace the probe barrier with waiting for the toast/receipt to settle. | Medium. |
| 7 | 145-173 | T6 | Replaces `browserPhotoLibrary.changeMany` to simulate decline. | Keep (no user action declines in a browser); document it as the decline boundary. | None. |
| 8 | 6, 147-150 | C3 | Photo seeding repeated inline. | Shared `seedPhoto` helper. | None. |

## Proposed end state
Five cases in `journeys/camera-photos.spec.ts`: (1) batch favorite, share-save zip with exact bytes, delete and undo, reload persists; (2) Cancel selection / Albums has no Select; (3) Share vs Save file (3 variants); (4) pending save/share retired by Back or hidden page with no download; (5) declined large delete stops after one confirmation. Compact-layout reachability moves to the accessibility journey. Store-level tests deleted; no Python.
