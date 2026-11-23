# apps/app/src/prototype/browser-camera.ts
- Lines: 446 | Role: Web (non-native) implementation of the Photos library (IndexedDB `alpha.browser.photos.v1` v3: `photos` + `video-data` stores, albums in `albumDocument`, edit receipts), the `getUserMedia` camera preview/capture/recording, and the "Choose camera image" import dialog. | Verdict: SPLIT + MOVE to `apps/app/src/browser/` (D11: it is the browser-side twin of the native plugins and already depends only on `browser/*`)
- Importers: 2 — `apps/app/src/prototype/camera-adapter.ts:26` (8 symbols), `apps/app/src/browser/files.ts:1` (`browserPhotoLibrary`, `browserPhotoFileEntries`, `saveBrowserMedia`).
- Text/path pins: most-read source in the folder (research P20: 110 test references). `test/browser-camera-storage.test.mjs:77` (esbuild bundle with stubbed imports, T2/T3; imports `splitVideoRow`, `editReceipt*`, seeds a v2 database at :135); 22 Playwright specs `page.evaluate(import('/src/prototype/browser-camera.ts'))` (T6: `browser-camera`, `browser-photo-edit`, `browser-video`, `album-storage-migration`, `photo-*`, `camera-controls`, `context-selection`, `dev-camera-*`, `media-polish`, `notes-photos-list-focus`, `video-edit`, `agent-camera-capture`, helper `test/browser/helpers/owned-photo.ts`); `test/recently-deleted.test.mjs`, `test/camera-preview-recovery.test.mjs`; `specs/quint/native/manifest.json:441,3914-3938` (7 text pins), `specs/quint/application/manifest.json:3367,3769`; refinement drivers `specs/quint/refinement/application/{browser-album-storage,camera-preview-retirement,photos-window}.mjs`, `specs/quint/refinement/native/copy-receipt.mjs:12,30,111` (opens `alpha.browser.photos.v1` directly), `specs/quint/refinement/legacy/camera-session.mjs:13`, `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs:19,174`; `test/support/feature-parity.mjs:343`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-45, 88, 217 | A1 | Upgrade-time migration of "earlier versions [that] stored each recording inside its row" (`moving=store.openCursor()…splitVideoRow…payloads.put(data);cursor.update(row)`) and read-side fallbacks `(data.result)?.path??row.path`. Rows written by the current code never carry `path` (all writers go through `splitVideoRow`: 248, 408). | Keep `version 3`, the store names and key paths byte-identical; in `onupgradeneeded` just create `photos` (+index) and `video-data` if missing. Delete the cursor move and both `??row.path` fallbacks, and the v2 case in `test/browser-camera-storage.test.mjs:135`. | Low (dev-preview data only; D1). |
| 2 | 106, 197 | C3 | `photoId` and `mediaId` are byte-identical (`Date.now().toString().padStart(13,'0')+…12 random digits`). | One `mediaId()`; keep the format (receipt parser depends on it, comment 382). | None. |
| 3 | 11-12 | D4/D7 | `export {editReceiptAbandoned,editReceiptSettled}` re-exports from `browser/edit-receipt`; the only external user is `test/browser-camera-storage.test.mjs`. | Delete the re-export; the test (if kept) imports `browser/edit-receipt.ts`. | None. |
| 4 | 8, 31, 201 | A7 | Exports with no importer outside this file: `type ImportedCameraImage` (0 external hits), `SHARE_LIMIT` (0), `splitVideoRow` (test only). | Unexport. | None. |
| 5 | 53, 296-297 | B2 | Web Locks treated as optional in `withPhotoMutation` (`navigator.locks?.request?…:action()`, silently unlocked) but required in `changeAlbum` (throws). Every supported engine (Chromium WebView, Firefox, Safari 15.4+) has Web Locks; `runtime/browser-notes-document.ts:32` already requires it. | Require it in both places (`navigator.locks.request`). | Low. |
| 6 | 191-193, 249 | C3 | "mark the claimed receipt failed" transaction written twice (photo edit and video copy). | `failReceipt(key, attempt?)`. | None. |
| 7 | 230-235, 267-271 | C3 | `saveBrowserMedia` and `shareMany` share the same prelude (`current()` check, `selectedMedia(…,SHARE_LIMIT)`, `selectedMediaFiles`, re-validate rows, `document.hidden` check). | `preparedFiles(input,current)` helper. | None. |
| 8 | 86, 92, 217, 255, 309 | C3 | `['image','video'].includes(row.kind)` 5× and the `trashedAt` patch (93, 311) twice. | `isMedia(row)`, `withPatch(row,patch)`. | None. |
| 9 | 252-253 | C1 | File-entry object type written inline twice in one signature. | `type PhotoFileEntry`; check `browser/files.ts`/upstream `createBrowserFiles` entry type and reuse it. | None. |
| 10 | 342, 357, 432-433 | D12 | Inline `style.cssText` for screen light, preview video, file input and preview image. | Classes in `scan-dialog.css` / camera CSS. | Visual. |
| 11 | 390-395, 400 | D5 | Dev-profile simulation inside product code: `flashAvailable(){return browserDevProfile\|\|…}`, `lightingLabel` "Screen light", `setScreenLight` when no torch in dev, `development:browserDevProfile` focus option. | Move the screen-light simulation into a dev module that wraps `browserCamera` (D6). | Low. |
| 12 | 428-446 | C4/P12 | `openCameraImageImport` hand-rolls `<dialog>` lifecycle (focus return, `alpha-back`, pagehide, visibility, Escape) that `source-review-dialog.ts openReview` / `runtime/inline-modal` already implement. | Build on `openReview` (it supports custom footer buttons). | Medium (keyboard/focus semantics must match; accessibility specs cover it). |
| 13 | 343 | NEW (import-time side effects) | Module evaluation adds `pagehide` and `visibilitychange` listeners on `window/document` that are never removed. | Register in `startPreview`, remove in `stopPreview`. | Low. |
| 14 | 328 | B4? | `browserLibrary=new Proxy(browserPhotoLibrary,{get…??unavailable})` — exists so `camera-adapter.ts:130` can call native-only methods on the web library and get a uniform refusal. | Keep, but declare the refused methods explicitly (a typed object spreading `browserPhotoLibrary` plus named `unavailable` members) so TypeScript can see them instead of `as unknown as typeof nativeLibrary`. | Low. |
| 15 | 44, 217, 243, 248, 255, 317, 320 | D8 | 400-1,200-character lines (IndexedDB callbacks nested inside one statement). | Format; name inner callbacks. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ImportedCameraImage` | type | 8 | none external | keep, unexported |
| `Row`, `VideoData`, `Album`, `SelectedMedia`, `EditRecord`, `EditSession`, `EditResult`, `EditParameters` | types | 15, 22, 96-103, 196, 199 | native plugin result types in `camera-adapter.ts`/`.eliza` photos plugin contracts | keep in the library module; align `EditResult` with the native `editResult` contract type |
| `revision` | helper | 17 | `crypto.randomUUID()` wrappers across runtime | keep |
| `dataUrlFacts` | helper | 25-28 | data-URL parsing in `runtime/` media helpers (e.g. `media-copy-intent`) | `browser/data-url.ts` if a second user exists |
| `photoId` / `mediaId` | helper | 106 / 197 | each other | one `mediaId` |
| `withPhotoMutation`, `transaction`, `runPhotoTransaction` | helper | 52-65 | IndexedDB transaction wrappers in `browser/preference-documents.ts` / browser document stores (C4 "durable store" ×8) | shared browser IDB helper (C4) |
| `selectedMedia`, `trashSelection` | helper | 202-213 | upstream `TrashDeleteRequest` validation (comment 206) | keep |
| `filters` (CSS filter table) | const | 105 | `browser/photo-filter.ts` (software fallback) | `browser/photo-filter.ts` (one table for both paths) |
| `finder` selector | const | 16 | `camera-adapter.ts` viewfinder selectors | camera constants module |

## Proposed end state
Move and split into `apps/app/src/browser/`:
- `browser-photo-library.ts` (~230): IndexedDB store (no v2 migration), list/read/albums/favorite/trash, edit and video-copy receipts with shared `failReceipt`, file entries, share/save.
- `browser-camera.ts` (~110): preview, capture, zoom, torch, focus, recording; dev screen-light moved to a dev wrapper.
- `camera-image-import.ts` (~25 on `openReview`).
Deleted: migration cursor and fallbacks, duplicate id function, test-only re-exports/exports. ≈380 lines total before formatting (≈65 removable).

## Verification
- Playwright: all photo/camera/video specs listed above (`npm run test:browser`, production variant) — they `import('/src/prototype/browser-camera.ts')`, so a MOVE must update 22 spec paths, `test/browser/helpers/owned-photo.ts` and the Quint drivers in the same change.
- Quint: native manifest copy-receipt, application `browser-album-storage`, `photos-window`, `camera-preview-retirement` (text-anchored; re-anchor or port).
- LemmaScript: `browser/edit-receipt.ts` proofs are unaffected (functions stay there).
- Host: `test/browser-camera-storage.test.mjs` (T2/T3; drop or port to Playwright).
- Not provable by web tests: Android camera/photos (native plugin path).
