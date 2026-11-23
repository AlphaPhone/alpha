# Alpha parity audit: camera (Camera, viewfinder, Photos, scan/OCR, media review, agent capture, sharing)

Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-develop` / `eliza-vs`.
Paths below are relative to those trees. `L:` = legacy, `P:` = port. Read-only audit; nothing was built or run.

## Summary

| Class | Count |
| --- | --- |
| OK | 46 |
| CHANGED | 15 |
| UNIMPLEMENTED | 6 |
| MISSING | 7 |
| UNMODELED | 3 |
| KNOWN | 4 |
| RETIRED | 0 |
| UNVERIFIED | 4 (listed under Not covered) |

Verdict: **not at parity.** The Camera viewfinder, the recorder, tap-to-focus, the assistant's requested
photo, the scan/Keep state machines and the Photos catalog are carefully specified (16 rule files, every
`###` rule has a Quint block, 240 `always/sometimes/law/step` properties) and the shell code really drives the
generated Machines. Android is intact (the same 30 camera/photos/media classes; `AlphaPhotosPlugin` only gains
`reviewRemovedVideoCopy`). The losses are concentrated in three places: (1) the **Photos screen** is a thin
UI over a rich model, so several modelled or legacy behaviours have no control (viewer favourite/trash/recover,
swipe, zoom, album rename/delete/remove, Select all, Empty trash, crop drag, video preview playback, library
Retry); (2) **storage**: scan drafts and the whole browser photo library moved from IndexedDB into single
`localStorage` JSON values, with no adoption of the legacy data; (3) **scan** re-implements locally what
legacy shared with upstream and what `eliza-vs/packages/files/src/documents/*` still provides, and drops
behaviour on the way (event suggestion rules, refusal of unsupported text, draft Resume/Delete, close
question). Two behaviour changes an owner would notice on the phone immediately: a photo asked for from
Home no longer opens Camera first (it fails with "Open Camera first"), and recordings changed from
5 min / medium to 10 min / high with the same 100 MB cap. Vibestack usage: no `.proof.dfy` exists anywhere
in the port, the camera tests (about 30) drive services and Machines directly but no generated conformance
cases (no `test/drivers/camera__*`), and there is no rendered-UI test for Camera or Photos (legacy had 46
Playwright specs and about 400 test titles in this slice).

## Gaps

Most severe first.

### 1. MISSING: a photo requested away from Camera no longer opens Camera first
- Behaviour: when a reply proposes `camera_capture_photo` for the owner's current message and Camera is not in front, the phone opens Camera and then continues the photo.
- Legacy: `L:test/camera-view-first.test.mjs:17-38` (`requestedCameraNeedsCameraView`, `proposalContextNotice`), `L:apps/app/src/ui/device-actions/client-coordinator.ts:330`, used from `L:apps/app/src/runtime/device-actions.ts`; `L:test/browser/agent-camera-capture.spec.ts` ("Home/Maps camera request: …"); `L:test/camera-direct-request.test.mjs` ("the Camera continuation hands the owner's…").
- Port: `P:apps/app/spec/camera/agentCapture.md:77-96` says "A hidden Camera, another screen … fails at once"; `P:apps/app/src/camera/agentCapture.vibe:134-137` answers "Open Camera first". Searched `P:apps/app/src/assistant/**`, `P:apps/app/src/shell/**`, `P:apps/app/spec/assistant/*.md`: `destinationOf(CameraCapture) = "camera"` (`spec/assistant/review.md:303-307`) is used only for the card's tap target (`src/assistant/review.vibe:307`, `src/web/assistant/ChatPanel.tsx:124`). Nothing opens Camera before the executor runs.
- Impact: "take a photo" said on Home, Maps or any other app fails instead of taking the photo.
- Smallest fix: add the rule to `spec/camera/agentCapture.md` (a request for the current message over a hidden Camera first asks the shell to show Camera, then queues) and call `CameraHandoffs.open("camera")` + `viewfinder.settled()` in `src/camera/agentCapture.vibe` `run()` before `ask`; or put it in `spec/assistant/review.md` / `src/assistant/review.vibe` for class `CameraCapture`. Needs the assistant slice's auditor to confirm which side owns it.

### 2. CHANGED: recording limits and quality
- Behaviour: a recording is 5 minutes at most, medium quality, 100 MiB.
- Legacy: `L:apps/app/src/prototype/camera-adapter.ts:854` `RECORDING = { audio: true, saveToGallery: true, quality: 'medium', maxDuration: 300, maxFileSize: 104857600 }`; browser capture refuses limits over 300 s (`L:apps/app/src/browser/video-capture.ts:38`).
- Port: `P:apps/app/src/camera/bridge.vibe:30` `RECORDING = { quality: "high", maxDuration: 600, maxFileSize: 100_000_000 }` ("ten minutes, or 100 MB"); also used for `setCaptureMode` (`bridge.vibe:88`).
- Impact: at "high" bitrate the 100 MB cap is reached far sooner in time than before (the "max length" stop arrives early), and any clip over five minutes cannot be opened in the video editor (`spec/camera/videoEdit.md` "An editor opens over a video of up to five minutes"). Not listed in the open-items doc. The exact bitrate behind "high" in upstream `CameraPlugin` was not checked (UNVERIFIED).
- Smallest fix: restore `medium` / `300` / `104857600` in `src/camera/bridge.vibe`, and state the limits in `spec/camera/viewfinder.md` (the rule "A recording ends by the owner, by its length or size limit…" names no numbers).

### 3. CHANGED: the Photos viewer lost its single-item actions and its info sheet
- Behaviour: in the viewer the owner can Favorite, Delete (to Recently deleted), Recover, Delete forever, and open Info.
- Legacy: `L:apps/app/src/prototype/template.html:2180` (`photos.v.del`), `:2181` (`deleteForever`, `recover`), `:2192` (`v.fav`), `:2194` (`v.info`), labels at `L:apps/app/src/prototype/camera-adapter.ts:1841`.
- Port: `P:apps/app/src/web/camera/PhotosScreen.tsx:214-221`: the footer offers Share, Ask Alpha, Email, Messages, Edit, and a button labelled "Info" that calls `openAlbumDialog("", false)`, which opens the **New album** dialog (line 220). There is no favourite, trash, recover or delete-forever control for the open item; `PhotoStore.setFavorite` has no caller in `src/camera/library.vibe`.
- Impact: every single-photo change now needs Back → Select → tap → action; "Info" does the wrong thing.
- Smallest fix: rules in `spec/camera/browse.md` under "Look at one photo" (viewer change = a one-item selection change); `favoriteOne/trashOne/restoreOne` in `src/camera/library.vibe` reusing `change()`; buttons in `PhotosScreen.tsx`; make Info show the details or open the album choice for that item (`openAlbumDialog("", true)` with the viewer item).

### 4. UNIMPLEMENTED: viewer swipe, zoom and pan are modelled but no control calls them
- Behaviour: swipe moves to the previous/next item; pinch, double tap and keys zoom 1×–8× and pan.
- Legacy: `L:apps/app/src/prototype/photo-viewport.ts`, `L:test/photo-viewport.test.mjs` (4 tests), `L:apps/app/src/prototype/camera-adapter.ts:1838-1840` (`prevItem/nextItem`, viewer label), fix #1388 (238418ea9, 2026-11-18, "Polish Photos zoom controls").
- Port: spec has both rules (`spec/camera/browse.md` "The viewer opens on an item the list shows, swipes within it…", `spec/camera/media.md` "A preview zooms between 1× and 8×…"). `PhotoLibrary.swipe` (`src/camera/library.vibe:391`) has no caller; `zoomedTo`, `pans`, `doubleTapped` from `gen/camera__media` are imported only by `test/camera/stories.test.vibe:10`. The viewer is a plain `<img>` in a Sheet (`PhotosScreen.tsx:208-210`).
- Impact: photos cannot be zoomed or swiped through.
- Smallest fix: pointer handlers in `PhotosScreen.tsx` (or a `PhotoViewer.tsx` + `.meta.tsx`) calling `library.swipe` and the media zoom functions.

### 5. UNIMPLEMENTED / MISSING: album rename and delete are unreachable; remove-from-album is gone
- Behaviour: an open custom album offers Rename album, Delete album and removing an item; "Removed from album".
- Legacy: `L:apps/app/src/prototype/template.html:2101` (`alb.manage`, Rename/Delete), `L:apps/app/src/prototype/camera-adapter.ts:577-597` (`mutateAlbum`, toasts "Album deleted" / "Removed from album"), `L:test/browser/photo-albums.spec.ts` ("creates with selected media, renames, removes, adds and deletes"), `L:test/browser/photos-clean-controls.spec.ts`.
- Port: `spec/camera/albums.md` models `ManageAlbum`, `RenameOp`, `DeleteOp` (UNIMPLEMENTED in UI): every `openAlbumDialog` call passes target `""` (`PhotosScreen.tsx:164,193,220`), so the Manage stage never opens. `AlbumOp = CreateOp | RenameOp | DeleteOp | AddOp` has no remove (MISSING), although the store type still has it (`src/camera/photos.vibe:43`).
- Impact: an album can be created and filled but never renamed, emptied of one item, or deleted.
- Smallest fix: an "Album options" control in the album header of `PhotosScreen.tsx` calling `openAlbumDialog(id, false)`; add `RemoveOp` to `spec/camera/albums.md` and to `albumEvent` in `src/camera/library.vibe`.

### 6. CHANGED: albums show only what the loaded window happens to hold, and counts come from that window
- Behaviour: Favorites, Videos, Camera, Screenshots and custom albums are their own paginated lists; counts come from the store's summary.
- Legacy: `L:test/browser/photo-order.spec.ts:53` ("favorites, videos, trash and custom albums paginate within their filters"), `L:apps/app/src/native/alpha-photos.ts` (`list({album})`, `summary()`), `L:specs/quint/application/PhotosWindow.qnt` + `L:test/quint-photos-window.test.mjs` ("an old Photos summary failure preserves the current successful counts").
- Port: `P:apps/app/src/camera/library.vibe:128-132` builds an album as `c.main.rows.filter(...)`; `PhotosScreen.tsx:151` counts `catalog.main.rows.filter(album.match).length`; custom albums show no count and only members already in the window. `store.summary()` and `store.list({album})` are never called for albums (`list({album:"camera", limit:1})` only for Camera's tile, `viewfinder.vibe:179`). Not modelled in `spec/camera/library.md`.
- Impact: on a library larger than the pages loaded so far, albums look incomplete or empty and counts are wrong until the owner taps "Show more" on the Library tab.
- Smallest fix: an album window in `spec/camera/library.md` (a third window keyed by album, read with `list({album, before})`), `summary()` for counts, wired in `src/camera/library.vibe`.

### 7. CHANGED (data durability): scan drafts moved from IndexedDB to one localStorage value; old drafts are not adopted
- Behaviour: a multi-page scan draft (up to 20 pages / 64 MB) is saved as binary pages and survives reload.
- Legacy: `L:apps/app/src/browser/scan-draft.ts:1-3` (`createScanDraftStore('alpha.browser.scan-draft.v1')`), `eliza-develop/plugins/plugin-files/src/documents/scan-draft.ts:93` (`indexedDB.open`), `L:test/browser/scan-draft.spec.ts` (9 tests incl. "draft binary page bytes and order survive reload", "legacy Blob drafts remain readable").
- Port: `P:apps/app/src/camera/scanner.vibe:17,133-151` writes `JSON.stringify({revision, pages: base64[], layers})` to `KeyValueStore` key `alpha/camera/scan-draft/v1`; `P:apps/app/src/platform/storage.vibe:12` is `KeyValueStore.layerStorage(() => localStorage)` on every build. Upstream still offers the IndexedDB store (`eliza-vs/packages/files/src/documents/scan-draft.vibe:126`, spec `eliza-vs/spec/files/scan/drafts.md`), unused.
- Impact: two or three real page photos exceed the WebView's localStorage quota, so autosave and "Save draft" stop committing (`writeDraft` returns undefined; the owner is told "Another draft is saved. Load or delete it first.", `scanner.vibe:375`, which is false). Drafts saved by the legacy app are never read again.
- Smallest fix: use `createScanDraftStore` from `@elizaos/files` in `src/camera/scanner.vibe` with the legacy database name; say in `spec/camera/scan.md` where the draft lives and that the legacy draft is adopted.

### 8. CHANGED: a draft stored before the scan opened cannot be deleted, is not offered, and Close never asks
- Behaviour: an old stored draft shows Resume and Delete, Delete unblocks autosave; closing a native review with autosaved pages asks Keep or Discard.
- Legacy: `L:test/scan-document-drafts.test.mjs:39` and `:52` (6 tests), fixes 1d55da459 and 35acbb4e1 (2026-11-07), `L:apps/app/src/ui/camera/scan-document.ts`.
- Port: `spec/camera/scan.md` `canDeleteDraft` needs `matchesDraftRevision(s.draftRevision, stored)`, and a fresh session has revision 0; `ScanReview.tsx:96` hides "Delete draft" while `draftOwner == NoDraft`; `scanner.vibe:399-406` removes only when `stored === now.draftRevision`. The only way out is "Load draft", which replaces the open pages. `closeDocument` (`ScanReview.tsx:77`, `scanner.vibe:212-220`) closes without a question and leaves the automatic draft behind, which then blocks the next review's autosave.
- Impact: after one closed review, later reviews silently stop autosaving.
- Smallest fix: `spec/camera/scan.md`: a `storedBeforeOpen` revision the session may delete or adopt, and a close question; `scanner.vibe` + two buttons in `ScanReview.tsx`.

### 9. CHANGED + Vibestack usage: scan re-implements the shared document modules and drops behaviour
- Behaviour: OCR, correction, edge detection, PDF, links and text layers come from the shared plugin-files documents code, with Alpha sentences for each keyed refusal.
- Legacy: `L:apps/app/src/browser/scan-correction.ts:1`, `scan-edges.ts:1`, `scan-draft.ts:1`, `L:apps/app/src/prototype/local-ocr.ts:1-5` (all re-export `.eliza/client-features/plugins/plugin-files/src/documents/*`); `L:apps/app/src/ui/documents/{scan-pdf-messages,local-ocr-messages,scan-correction-messages}.ts`; `L:test/scan-error-messages.test.mjs` (6 tests), `L:test/scan-review-pdf-errors.test.mjs` (6), `L:test/browser/scan-searchable.spec.ts:34` ("unsupported reviewed text can be corrected without dispatching an export"; "invalid positions and unsupported text reject before exporting").
- Port: `P:apps/app/src/camera/scanWork.ts` and `scanText.ts` are local rewrites; no file under `P:apps/app/src` imports `@elizaos/files`, although `eliza-vs/packages/files/src/documents/{local-ocr,scan-correction,scan-document,scan-draft,scan-links,scan-pdf,scan-text-layer}.vibe` and `eliza-vs/spec/files/{localOcr.md,scan/*.md}` exist. Observed differences: `buildPdf` silently strips characters Helvetica cannot draw (`scanWork.ts`, `line.text.replace(/[^\x20-\x7e -ÿ]/g, "")`) where legacy refused and let the owner correct the line; failures show only "Scan failed" / "PDF failed" / "Unreadable image" (`scanner.vibe:128,199,192`) instead of the limit or reason; recognition takes no abort signal (`scanner.vibe:124,416`).
- Impact: a searchable PDF can be missing text the owner reviewed, with no warning; failures no longer say why.
- Smallest fix: import the upstream modules in `src/camera/scanner.vibe`, delete the duplicates from `scanWork.ts`, map `OcrRefused/PdfRefused/DraftRefused` reasons to sentences in `src/camera/messages.vibe`; reference `eliza-vs/spec/files/scan/*` from `spec/camera/scanDialogs.md`.

### 10. CHANGED: the scanned-event suggestion lost most of its rules and its own review step
- Behaviour: poster text becomes a suggested event with every inference disclosed: explicit IANA/offset zones converted to the device zone, zone abbreviations and ambiguous numeric dates left blank with the reason, weekday/today/tomorrow resolved, nonexistent DST times refused, and the fields are reviewed and corrected in a scan event dialog before Calendar's form opens.
- Legacy: `L:apps/app/src/ui/documents/scan-event.ts` (772 lines; `suggestScanEventDetails`, `reviewScanEvent`, `reviewScanAllDayEvent`), `L:apps/app/src/prototype/scan-event-review.ts`, `L:test/scan-all-day-draft.test.mjs` (3 tests, this slice), `L:test/scan-event.test.mjs` and `L:test/browser/scan-event.spec.ts` (20+ rules, listed under calendar).
- Port: `P:apps/app/src/camera/scanText.ts` `suggestScanEvent` (about 30 lines: ISO or month-name date, first time window, weekday/daily/weekly words); `scanner.vibe:307-316` hands it straight to `CameraHandoffs.reviewScannedEvent`. No zone handling at all (a printed "6 PM UTC+2" becomes 18:00 local), no weekday/tomorrow, no numeric dates, no "why blank" text; "No event found" when no date is recognised. The spec rule (`scanDialogs.md` "An event suggestion opens Calendar's own form…") covers only the handoff.
- Impact: wrong times for zoned posters; fewer posters produce a suggestion. What Calendar's `reviewScan` validates was not checked (UNVERIFIED, calendar slice).
- Smallest fix: port `scan-event.ts` into `src/camera/scanText.ts` (or a shared calendar module) and add its laws to `spec/camera/scanDialogs.md`.

### 11. UNIMPLEMENTED: the crop area cannot be dragged or reset
- Behaviour: drag the crop area, drag a corner to resize against the opposite corner, hold a shape, Reset.
- Legacy: `L:apps/app/src/prototype/photo-crop.ts`, `L:test/photo-crop.test.mjs` (8 tests), `L:test/browser/browser-photo-edit.spec.ts:64`, `L:apps/app/src/prototype/template.html:2298` (Reset crop).
- Port: `P:apps/app/src/camera/imageEdit.ts:58` `dragCrop` exists and has no caller; `P:apps/app/src/web/camera/PhotoEditor.tsx:45-52` gives the crop frame only `onKeyDown`. On a phone the owner can pick an aspect preset (centred) and nothing else. The frame is also positioned against the container, not the fitted image.
- Smallest fix: pointer handlers on the crop frame and four corner handles in `PhotoEditor.tsx` calling `dragCrop`; a Reset button.

### 12. CHANGED: the Photos grid is not virtualised, pages by a button, and keeps every thumbnail in Machine state
- Behaviour: only on-screen rows render; scrolling near the end reads the next page; thumbnails are kept only around the rendered rows and re-fetched; a deep reload decodes thumbnails for the first page only.
- Legacy: `L:apps/app/src/ui/mobile-shell/photos-view.ts` (`virtualGrid`, `keepThumbnails`, `thumbnailPlan`, `readWindow`), `L:apps/app/src/prototype/camera-adapter.ts:1523-1533` (scroll paging), `L:test/photos-view.test.mjs` (12 tests), `L:test/photos-thumbnail-refresh.test.mjs`, `L:test/browser/photos-grid-density.spec.ts`, `L:test/browser/photos-pending-read.production.spec.ts`, fix 528011ed8.
- Port: `PhotoGrid.tsx` renders every row (`loading="lazy"` only); `PhotosScreen.tsx:177-179` "Show more"; `library.vibe:167` reads every page with `thumbnails: true` into `catalog.main.rows`, and every `libraryChanged` re-reads the whole window (`library.vibe:275-278`, `reload`). `PhotoStore.thumbnails` is never called.
- Impact: slow and memory-heavy on a real library; the owner must tap to see older photos.
- Smallest fix: virtual rows in `PhotoGrid.tsx`, an intersection sentinel calling `library.more()`, thumbnail window via `store.thumbnails`; rule in `spec/camera/library.md`.

### 13. UNIMPLEMENTED / MISSING: Select all and Empty Recently deleted
- Legacy: `L:apps/app/src/prototype/template.html:1986` and `camera-adapter.ts:1745` (Select all / Deselect all); `template.html:2102` and `camera-adapter.ts:1767` (`emptyTrash`, "Delete all forever", owned scope only; `prepareDeleteTrash({all:true})` in `L:apps/app/src/native/alpha-photos.ts`).
- Port: `selectAll` is in `spec/camera/browse.md` and `library.vibe:386` but no control calls it (UNIMPLEMENTED). No empty-trash event, store method or control (MISSING).
- Smallest fix: two buttons in `PhotosScreen.tsx`; `prepareDeleteAll` in `spec/camera/browse.md` + `library.vibe` + `photos.vibe`.

### 14. UNIMPLEMENTED: the video editor's preview cannot play
- Legacy: `L:apps/app/src/prototype/video-edit-review.ts`, `L:test/quint-video-edit-review.test.mjs` ("a source error during playback pauses the preview"), `L:test/browser/video-edit.spec.ts` ("rendered Photos edit opens trim controls and saves a playable video copy").
- Port: `spec/camera/videoEdit.md:74-77` has `play` / `pause`; `VideoEditor.tsx:36` renders `<video controls={false}>` and no control sends `play`. Rotation is shown by CSS; the crop is not previewed.
- Smallest fix: a play/pause button in `VideoEditor.tsx` sending the two events and seeking to the trim start.

### 15. CHANGED (browser build): the whole photo library is one localStorage value
- Legacy: IndexedDB with video bytes split from rows and Web Locks for album writes: `L:apps/app/src/prototype/browser-camera.ts:32` (`splitVideoRow`), `L:test/browser-camera-storage.test.mjs` (5 tests), `L:specs/quint/application/BrowserAlbumStorage.qnt`, `L:test/quint-browser-album-storage.test.mjs` ("browser without Web Locks refuses media-bound album writes").
- Port: `P:apps/app/src/camera/browserPhotos.vibe:11,58-75` reads and rewrites `alpha/browser/photos/v1` (items with base64 images, `keepVideo` base64 at `:152`, albums, receipts) through localStorage; no lock, no adoption of the legacy database.
- Impact: the browser build keeps a handful of photos and cannot keep a recording; two tabs overwrite each other.
- Smallest fix: an IndexedDB-backed store behind `browserPhotoStore`; state the storage in `spec/camera/albums.md` ("Keep album storage consistent with my photos").

### 16. CHANGED (browser build): recordings ignore zoom and the front mirror; every microphone failure reads as "denied"
- Legacy: `L:apps/app/src/browser/video-capture.ts:45-48` (zoomed/mirrored canvas stream), `:33-41` (only `NotAllowedError`/`PermissionDeniedError` become `MICROPHONE_DENIED`), `L:test/browser/camera-controls.spec.ts:26`, `L:test/video-capture-microphone.test.mjs` (4 tests), `L:test/video-capture-limit.test.mjs:83` ("an edited copy reports the range it actually produced").
- Port: `P:apps/app/src/camera/browserCamera.ts:213-259` records a clone of the raw track; `:217-221` maps any `getUserMedia` failure to `MICROPHONE_DENIED`; stop deadline 10 s (legacy 5 s); `browserMedia.ts:51` reports `end - start` as the copy's duration.
- Smallest fix: canvas `captureStream` when zoom ≠ 1 or mirrored, classify by `error.name`, in `browserCamera.ts`.

### 17. CHANGED: a failed library read shows "No photos" with no Retry
- Legacy: `L:apps/app/src/prototype/template.html:2043` ("Retry loading photos", `photos.libraryRetry`), "No matches" for an empty filter.
- Port: `PhotosScreen.tsx:167-170`: the empty state reads "Loading" / "No photos"; `catalog.main.failed` is only a five-second line ("Couldn’t load", `library.vibe:175`); `PhotoLibrary.refresh` has no UI caller. A filter with no matches also reads "No photos".
- Smallest fix: branch on `catalog.main.failed` and `browse.filtered` in `PhotosScreen.tsx`.

### 18. UNMODELED: a text read is not bound to the review that started it
- Legacy: recognition is aborted when its review closes (`L:apps/app/src/prototype/local-ocr.ts`, `L:test/browser/scan-searchable.spec.ts` "Back cancels recognition…").
- Port: `scanner.vibe:113-131` forks `recognizeText(image, undefined, …)` and sends `ocrSettled` with no ticket; `canOcrSettled` (`scanDialogs.md`) only needs `ocr == OcrStarting`. Close one scan and open another while the first is still reading, and the first image's text lands in the second review.
- Smallest fix: an OCR ticket on `openText` / `ocrSettled` in `spec/camera/scanDialogs.md`; pass an `AbortSignal` in `scanner.vibe`.

### 19. CHANGED: a failed lens switch leaves the screen showing flash and zoom that the camera no longer has
- Legacy: `L:test/browser/camera-controls.spec.ts:187` ("switching with flash on and zoom 2x keeps both reset when the switch fails").
- Port: `viewfinder.vibe:393-407` first writes flash off and zoom 1 to the bridge, then on failure sends `flip ok:false`, which leaves the model unchanged (`viewfinder.md` `flip`): the header still says Flash on / 2×.
- Smallest fix: `flip(ok=false)` resets `flash`, `light`, `zoom` in `spec/camera/viewfinder.md` (or the shell restores the settings).

### 20. CHANGED: the volume-key shutter state is not sent again after a failed native call
- Legacy: `L:apps/app/src/prototype/camera-controls.ts` `volumeShutterSync`, `L:test/camera-controls.test.mjs:45`.
- Port: `viewfinder.vibe:134-138` sets `volumeArmed` before the call and swallows the failure.
- Smallest fix: clear `volumeArmed` in the `catch` of `armVolume`.

### 21. MISSING (browser build): import an image into Photos, and save selected media locally
- Legacy: `L:apps/app/src/prototype/browser-camera.ts:435-453` (dialog with "Save to Photos" and "Scan text"), `template.html:1969`; `camera-adapter.ts:1753` (`selSaveLocally`), `L:test/browser/photo-batch.spec.ts` ("…download journey", "media external sharing is separate from saving").
- Port: "Choose image" goes only to the text review (`PhotosScreen.tsx:114`); Keep is hidden for a picked image (`ScanReview.tsx:60`); no download path (`browserMedia.ts` shares or refuses).

### 22. UNIMPLEMENTED: the focus target is never drawn; browser focus points are not mapped through mirror and zoom
- Legacy: `L:apps/app/src/browser/camera-focus.ts` (`cameraFocusTarget`), `L:test/browser/dev-camera-focus.spec.ts` ("hardware point is mapped through mirrored zoom and checked against settings").
- Port: `spec/camera/focus.md` keeps `reticle` and `confirmed`, but `CameraView.tsx` receives only the viewfinder state and draws nothing; `browserCamera.ts:291` writes the raw tap. Whether the production legacy build drew a reticle was not confirmed (UNVERIFIED).

### 23. MISSING (developer-only): screen light and development focus targets
- Legacy: `L:apps/app/src/prototype/browser-camera.ts:347-350` (`setScreenLight`, `browserDevProfile`), `L:test/browser/dev-camera-light.spec.ts` (3 tests), `dev-camera-focus.spec.ts` (7). Not ported; not in the open-items list of unported developer pieces (that bullet names only Browser).

### 24. CHANGED (low): saved-copy recovery is silent
- Legacy shows a recovery control (`template.html` `photos.copyRecoveryLabel` / `openCopyRecovery`, `camera-adapter.ts:400-403`). Port recovers only when the next editor opens (`editor.vibe:90-109,132`); `MediaEditor.recover` has no UI caller.

### 25. CHANGED (low, browser build): flash cycle, torch confirmation, front zoom
- Legacy: browser flash is torch on/off only (`camera-controls.ts` `nextFlashMode(mode, browser)`, `L:test/camera-controls.test.mjs`), the torch setting is read back and refused if unconfirmed, front camera `maxZoom: 1` (`browser-camera.ts` `setSettings`, `startPreview`).
- Port: Off/Auto/On everywhere with "auto" mapped to torch off (`bridge.vibe:130`), no read-back (`browserCamera.ts:288-290`), `maxZoom: 8` for both lenses (`:67`).

### 26. KNOWN: Tesseract OCR assets are not set up
- Open-items, "Tooling / repository root": files not served under `apps/app/public/ocr/`, `vite.config.ts` lacks `localOcrAssets()`, `package.json` lacks `tesseract.js-core` and `@tesseract.js-data/eng`. Confirmed: `P:apps/app/public/ocr` does not exist and `P:apps/app/package.json:73` lists only `tesseract.js`. Until fixed every text read ends in "Scan failed" (`scanWork.ts` `workerPath: "/ocr/worker.min.js"`).

### 27. KNOWN: Photos reads always need review
- Open-items, Owner decisions: "The assistant's Op set has no Photos read class, so Photos reads (search, inspect) use PhotosChange and always need review." Legacy read locally (`L:test/photo-library.test.mjs` "agent operations: search/inspect/select read locally; every change or share is a review"). `P:apps/app/src/camera/operations.vibe` `classOfOperation`.

### 28. KNOWN: no test covers a chat that stays open during the reveal
- Open-items, "Unverified in the code-only phase → No tests". Legacy: `L:test/browser/camera-chat-state.spec.ts` (4 tests), fix #1386.

### 29. KNOWN: generated name `camera__agentCapture` `panelLimitMs` unverified
- Open-items, "Generated names → camera". Used at `agentCapture.vibe:2,76`.

### 30. MISSING (Vibestack usage): no Dafny proof for properties legacy proved
- Legacy: `L:specs/lemma/apps/app/src/browser/video-capture.dfy(.gen)` (`admitVideoChunk` contract, `L:apps/app/src/browser/video-capture.ts:10-22`), `L:specs/lemma/apps/app/src/browser/video-edit.dfy(.gen)` (`validVideoEdit`, trim-clock split, produced range; `L:apps/app/src/browser/video-edit.ts:17-57`).
- Port: `find alpha-vs -name '*.proof.dfy'` returns nothing. `spec/camera/recorder.md:45-50` restates the admission as a Quint law (`lawAdmissionNeverPassesTheLimit`), `videoEdit.md` has the clock rule, but neither is proved.
- Smallest fix: `spec/camera/recorder.proof.dfy` and `spec/camera/videoEdit.proof.dfy` from the legacy lemma files.

### 31. MISSING (Vibestack usage): the camera tests drive no generated conformance cases and no rendered UI
- Port: `P:apps/app/test/drivers/` has drivers for notes, telephony and workflows only; `P:apps/app/test/camera/{camera,photos,scan,stories}.test.vibe` hold about 30 tests that call services and Machines with a fake `Native`. Legacy: 93 listed files, about 400 titles, 46 Playwright specs (contrast, layout at several viewports, keyboard/focus ownership of the delete review and album manager, grid density). None of the accessibility and layout checks has a counterpart: `photo-album-accessibility`, `photo-delete-accessibility`, `scan-review-keyboard`, `camera-overlay-contrast`, `photo-overlay-contrast`, `camera-tools-layout`, `photos-grid-density`.
- Also: the 20 legacy Quint models had replay tests against the mounted code (`test/quint-*.test.mjs`, "… is rejected by the replay"); the port has no replay or driver for any camera spec.

### 32. UNMODELED: decisions the shell makes that the spec does not state
- Batch sizes 20 (owned) and 500 (permitted) in `src/camera/photoGrid.vibe` `changeBatches` (the rule in `browse.md` says only "in batches"; legacy `L:test/photos-view.test.mjs` "one reviewed request per 500").
- Export status mapping (`cancelled|failed|unavailable|too-large` retryable, `exported|requested` confirmed) in `scanner.vibe:209`.
- Built-in album membership by folder regex (`photoGrid.vibe` `albumOf`, duplicated in `PhotosScreen.tsx:51-56`).
- Recording limits and quality (`bridge.vibe:30`), the 10-second chat grace (`viewfinder.vibe:60`), preview resolution.
- `viewfinder.vibe:143` recomputes "the conversation covers" inline instead of the generated `chatCovers`.
- The access-notice sentences, capture error sentences and `PHOTOS_MESSAGES` map (`messages.vibe`) have no rule; legacy tested them (`camera-controls.test.mjs`, `ui/photos/photos-messages.ts`).

### 33. UNMODELED: the secure-camera rule is a tautology
- `spec/camera/viewfinder.md:447-456` defines `cameraFor(locked)` and proves it returns what it returns. The real guarantee (no lock-screen surface or secure-camera handler in the APK; the image stages the system camera) lives in `P:scripts/aosp-secure-camera-contract.ts`, `P:scripts/os-ported/os/secure-camera.mjs` and `P:test/aosp-secure-camera*.test.mjs`, which are retained from legacy (`scripts/os-ported/**` is a KNOWN rewrite item). The spec rule should name those checks or be dropped.

## Confirmed OK

Verified by reading the legacy source or test, the spec rule and the port code.

| Behaviour | Legacy | Spec rule | Port code |
| --- | --- | --- | --- |
| Preview runs only while Camera is active; stale start answers move nothing | `test/camera-rapid-leave.test.mjs`, `CameraPreviewRetirement.qnt` | viewfinder.md "Camera starts its preview only when active…", "Only the answer to the current start…" | `src/camera/viewfinder.vibe:118-166` |
| Leaving releases the preview; late stream is stopped | `browser-camera.spec.ts` ("leaving … while permission is pending") | viewfinder.md "Leaving Camera releases the preview at once…" | `viewfinder.vibe:152-161,352-359` |
| Hidden page / lock stops preview, show restarts | `camera-resume` (file absent), `host-ports.ts` | "Hiding the page stops the preview…" | `viewfinder.vibe:282-293`, `shownOf` |
| Chat detent kept over Camera; covering chat has a grace | `browser/camera-chat-state.spec.ts`, #1386 | "Camera is active while it shows…" | `viewfinder.vibe:140-150` |
| Shutter, pending press, capture settles tile | `camera-controls.spec.ts` | "The shutter in Photo mode…", "A settled capture…" | `viewfinder.vibe:185-204,376-388` |
| Self-timer Off/3/10, second press cancels | `camera-controls.test.mjs`, `browser/camera-controls.spec.ts` ("the self-timer counts down…") | "The self-timer steps…", "The countdown's last tick…" | `viewfinder.vibe:206-216`, `CameraView.tsx` |
| Flash Off/Auto/On on the phone, only with a flash unit | `camera-controls.ts` | "Flash steps Off, Auto, On…" | `viewfinder.vibe:414-419` |
| Zoom within lens range, none while recording; pinch does not focus | `camera-controls.spec.ts` (pinch) | "Zoom stays within the bound lens's range…" | `viewfinder.vibe:295-312,408-413`, `CameraView.tsx:79-108` |
| Framing grid over the preview only | `camera-controls.spec.ts` | "The framing grid is the owner's choice…" | `CameraView.tsx:113-117` |
| Volume key = one shutter press, off behind a dialog | `camera-controls.spec.ts`, `MainActivity.java:532-542` | "A volume key press is rechecked…" | `viewfinder.vibe:462-468`, `CameraScreen.tsx:23-34`, `P:MainActivity.java:540-550` |
| Only Video and Photo modes; Switch camera in header | `camera-controls.spec.ts` | "Changing mode binds the new capture mode…" | `CameraView.tsx:124,176-185` |
| Photo mode closes the microphone notice | `camera-controls.spec.ts` | same rule | `viewfinder.md pickMode`, `viewfinder.vibe:389-391` |
| Sound by default, No sound only when chosen, mic notice | `video-capture-microphone.test.mjs` (native path) | "A recording starts with sound…" | `viewfinder.vibe:251-266` |
| Recording timer shows time left within a minute | `camera-controls.test.mjs`, `camera-controls.ts` | "The recording timer shows the time left…" | `messages.vibe` `recordingLabel` |
| "max length" only after a limit stop; unconfirmed save says so | #1345 | "A recording ends by the owner, by its length or size limit…" | `viewfinder.vibe:232-249` |
| Video light chosen before recording | `camera-controls.test.mjs` ("Video mode names its light") | "Video's light holds the flash unit on…" | `viewfinder.vibe:426-433` |
| Access notice wording, Allow / Retry | `camera-controls.ts accessDetail` | "A camera or unavailable notice's Retry…" | `messages.vibe accessDetail`, `CameraView.tsx:156-169` |
| Return from Settings restarts only on a read grant | `ui/camera/host-ports.ts restartAfterResume` | "Returning from Android's settings…" | `viewfinder.vibe:268-275` |
| `PREVIEW_STOPPED` offers Retry | camera-capture-messages.ts | "A capture-mode binding settles…" | `viewfinder.vibe:168-176` |
| Last capture tile by library identity; opens that item in Photos | `camera-controls.spec.ts` ("the last capture opens directly…") | "The last-capture tile is read…" | `viewfinder.vibe:178-183`, `CameraScreen.tsx:71`, `library.vibe:336-370` |
| Tap-to-focus: one driver write at a time, retired taps never confirm | `CameraFocusWrites.qnt`, `quint-camera-focus-writes.test.mjs` | focus.md (5 rules) | `viewfinder.vibe:104-116,434-440`, `browserCamera.ts:291-314` |
| Browser recording keeps what fits, stops at the limit, saved only after its prefix decodes | `video-capture.ts:10-22`, `video-capture-limit.test.mjs`, `VideoRecorder.qnt` | recorder.md (6 rules) | `browserCamera.ts:229-278` (uses generated `admitChunk`) |
| Requested photo: owner's words once per message, else card | `camera-direct-request.test.mjs` | agentCapture.md "A direct capture runs only…" | `operations.vibe:104-118`, `agentCapture.vibe` |
| Requested photo needs the uncovered, ready, idle viewfinder; reveal waits for the panel | `quint-camera-agent-capture.test.mjs`, #1239 | agentCapture.md (reveal, recheck rules) | `agentCapture.vibe:128-165` |
| Named lens flips once; failed flip takes nothing | `agent-camera-capture.spec.ts` | "A request that names the other camera…" | `agentCapture.vibe:158-162`, `viewfinder.vibe:488-498` |
| Saved without identity or lost answer = unknown, never repeated; library id only when offered | `camera-contract.ts`, `CameraAgentCapture.qnt` | "A saved photo with its library identity succeeds…" | `agentCapture.vibe:93-124`, `actions.vibe:60-62` |
| "Scan this" / "what am I looking at" over Camera never reach the agent as text | `camera-chat-state.spec.ts` (scan asked on Camera) | scan.md "Only a complete, bounded scan request…", media.md "A frame question…" | `chat.vibe`, `assistant/composer.vibe:286`, `scanText.ts` |
| Scanned frame reaches Photos only by Keep, one identity, retry only when safe | `CameraScanKeep.qnt`, `browser/scan-keep.spec.ts`, 62bac0700 | scan.md "A scanned frame reaches Photos only by its explicit Keep…" | `scanner.vibe:285-298` |
| Save to Notes once; unconfirmed stays latched | `scan-review.ts`, a6c1595a4 | scanDialogs.md "Save to Notes runs once…" | `scanner.vibe:266-273`, `notes/handoffs.vibe` |
| Links: explicit click on the current text only | `browser/scan-links.spec.ts` | "Only an explicit click on a link…" | `scanner.vibe:299-305`, `scanText.ts scannedLinks` |
| Page limits: JPEG/PNG/WebP ≤16 MB, ≤32 MP, 1–20 pages, ≤64 MB, PDF ≤8 MB | `browser/scan-document.spec.ts`, `scan-pdf.spec.ts` | scan.md "Pages meet every image, count and size limit" | `scanWork.ts`, `scanner.vibe:167-184` |
| Export holds its snapshot; only a definite non-write unlocks retry | `scan-review-pdf-errors.test.mjs`, `ScanDocument.qnt` | scan.md "An export holds its page snapshot…" | `scanner.vibe:197-210,424-428` |
| Correction: any corner change discards the preview; only a current preview applies | `browser/scan-correction.spec.ts` | scanDialogs.md "Any corner change discards the preview…" | `scanner.vibe:469-512` |
| Page capture is reviewed before it enters the document | `browser/scan-page-camera.spec.ts`, `scan-page-camera.test.mjs` | "The reviewed frame stays when the camera stops…" | `scanner.vibe:516-543` |
| A system picker keeps the review open; a plain hide closes it | `scan-pdf.ts systemPickerActive` | "A hidden page closes every dialog that started no picker…" | `scanner.vibe:108-111,545-551`, `layer.vibe:60-67` |
| Catalog: newest first, one read at a time, hidden page fences reads | `PhotosWindow.qnt`, `PhotosTrash.qnt`, `photos-view.test.mjs` | library.md (10 rules) | `library.vibe:159-186,296-304` |
| Honest access row: ask, choose more, or Android Settings; no automatic prompt | `browser/permitted-photos.spec.ts` | library.md "Each access offers its one honest action…" | `PhotosScreen.tsx:99,131-138` |
| Selection keeps existing items across a library change; long press, drag range, pinch 3–5 columns; day sections | `photos-view.test.mjs` | browse.md selection rules | `PhotoGrid.tsx`, `photoGrid.vibe`, `library.vibe:380-395` |
| Batched changes, a declined batch ends the run; Undo restores what the trash moved | `browser/photo-permitted-batch.spec.ts`, `photo-batch.spec.ts` | browse.md "A change reaches the selection in batches…", "Undo restores…" | `library.vibe:209-237,403-413` |
| Delete forever only from Recently deleted via a prepared confirmation | `PhotosTrashInstrumentedTest`, `alpha-photos.ts` | browse.md "Delete forever runs only…" | `library.vibe:422-438`, `PhotosScreen.tsx:264-273` |
| Share up to 100 items through Android's sheet | `PhotosMultiShareInstrumentedTest` | browse.md "Sharing hands up to 100…" | `library.vibe:239-246` |
| Assistant filter is read-only and clears | `photos-view-contract.test.mjs` | browse.md "The filter only narrows the visible list…" | `library.vibe:466-483`, `photoGrid.vibe filterMatches` |
| Photo edit: Save copy / Replace original with confirmation, stale source refused, unconfirmed save resolved by reading its outcome | `browser/browser-photo-edit.spec.ts`, `media-copy-intent.ts` | edit.md, copyIntent.md | `editor.vibe:63-167`, `PhotoEditor.tsx` |
| Video copy: ≥0.1 s, one save per editor, hide/close disposes, unconfirmed settled by review | `video-edit-review.ts`, `VideoCopy*InstrumentedTest` | videoEdit.md | `editor.vibe:168-214`, `layer.vibe:66`, `P:AlphaPhotosPlugin.java` (`reviewRemovedVideoCopy`) |
| Ask Alpha about a photo binds the conversation it was asked from | `browser-camera.spec.ts` ("a pending photo read cannot attach to a replacement conversation"), ef8e362af | media.md "An ask binds the conversation…" | `mediaReview.vibe` `askAboutPhoto` |
| Email ≤5 MiB JPEG/PNG/WebP into a fresh draft; Messages only for a sendable JPEG/PNG | `browser/photo-email.spec.ts`, #1414 | media.md "Email takes…", "Messages is offered only…" | `mediaReview.vibe`, `PhotosScreen.tsx:217-218`, `inbox/handoffs.vibe`, `telephony/share.vibe` |

## Not covered

- `P:apps/app/src/camera/agentPhotos.vibe` (266 lines) and `spec/camera/{agentLibrary,libraryReview}.md` bodies: only the rule headings, the UI wiring (`PhotosScreen.tsx:41-49,227-236`) and `operations.vibe`/`actions.vibe` were read. Legacy counterparts not compared line by line: `prototype/photo-library-adapter.ts`, `runtime/photo-library.ts`, `test/photo-library.test.mjs` (15 tests), `test/quint-photo-library-agent-review.test.mjs`, `test/quint-photos-agent-host.test.mjs`, `test/browser/photo-agent-review-leave.spec.ts`, `test/photos-view-contract.test.mjs` result validation.
- `spec/camera/{media,edit,copyIntent,albums,browse,library,recorder,focus,notices}.md` Quint bodies were read by heading and property name, not statement by statement; `browserPhotos.vibe` lines 100-355 only by grep.
- Android: only file lists, `AlphaPhotosPlugin` diff and plugin method names were compared. Not read: `AlphaMediaReview.java`, `AlphaMediaCopy.java`, the 3-line `DailyAppsPlugin` / `AlphaMailAttachmentsPlugin` diffs, all `androidTest` camera/photos tests (whether they still compile against the port's bridge).
- What "high" quality means in upstream `ai.eliza.plugins.camera.CameraPlugin` (gap 2), and what Calendar's `reviewScan` validates (gap 10).
- Legacy `test/photos-library-patch.test.mjs` ("Replace recovery restores its interrupted prefix…"), `test/quint-photos-owned-album.test.mjs` (4 album-dialog fences; the port's `albums.md` generation rule looks equivalent but was not replayed), `test/browser/photo-filter-fallback.spec.ts` (portable filter vs native canvas filter; port `imageEdit.ts LOOKS` not compared with Android's filter ids), `test/browser/chat-photo-history.spec.ts`, `test/browser/camera-media.production.spec.ts` second test (Files).
- Historical models: `specs/quint/legacy/{CameraSession,PhotosLibrary}.qnt`, `test/quint-historical-camera-session.test.mjs`, `test/quint-legacy-photos-library-refinement.test.mjs`, `test/fixtures/quint/PhotosLibraryComparison.qnt`: no counterpart looked for.
- Items in the camera lists that belong to other slices and were not audited: voice capture (`test/voice-capture-lifecycle.test.mjs`, `voice-capture-retirement.test.mjs`, `native-resident-capture.test.mjs`, `quint-live-capture`, `quint-piped-capture`, `quint-capture-frames`, `quint-batch-capture-completion`, `specs/quint/native/{NativeLiveCapture,NativePipedCapture,NativeCaptureFrames,BatchCaptureCompletion}.qnt`, `refinement/native/*Capture*`), the note recorder (`RecorderStage.qnt`, `quint-recorder-stage.test.mjs`, `fixtures/note-recorder-jvm`), `quint-source-bundle-capture.test.mjs` (tooling), `test/aosp-secure-camera.test.mjs` internals (image staging).
- `test/browser/album-storage-migration.spec.ts` and `test/camera-resume.test.mjs` are in the list but absent from the legacy tree at dd63c6bc.
- `scripts/legacy-retirement.json` entries for this slice were not checked against these findings.

## Skeptic verdicts

Each gap was re-read in legacy (develop dd63c6bc, which already contains #1422, so none of these is a #1422 retirement), searched for in the port under other names, in the spec, in `eliza-vs`, and in the author's working tree (`/home/shaw/.cache/vibemig/alpha` has no uncommitted change under `spec/camera`, `src/camera`, `src/web/camera` or `test/camera`; its `assistant/review` diff only renames `canDirect` to `directable`). Nothing was built or run.

| # | Gap | Verdict | Severity | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Photo asked for away from Camera does not open Camera first | confirmed | high | L `connection-ui.tsx:3419,3441` + `client-coordinator.ts:330`. P `composer.vibe:473` runs `directPass` before `viewed` (`:483`); `review.vibe:456-465` executes; `agentCapture.vibe:134-137` answers "Open Camera first"; spec `agentCapture.md:77-80` says another screen "fails at once". Upstream contradicts the port: `eliza-vs/packages/agent/src/device-actions/proposal/families/surfaces.vibe:29,182` tells the model "the requesting phone opens Camera itself" and tells the owner "Opening Camera to take the photo." Worse than stated: even an agent VIEWS step to Camera in the same reply is delivered after the direct pass. |
| 2 | Recording 10 min / high instead of 5 min / medium | confirmed | medium | L `camera-adapter.ts:854`; P `bridge.vibe:30,88,90`. Resolves the auditor's UNVERIFIED: `eliza-vs/packages/os/android/camera/.../CameraPlugin.kt:495-496` maps medium to HD and high to FHD, so the 100 MB cap (now 100,000,000, was 104,857,600) ends a clip sooner. `videoEdit.md:33,46` still refuses sources over 300 s. Not in open items. |
| 3 | Viewer lost Favorite / Delete / Recover / Delete forever / Info | confirmed | high | L `template.html:2176-2194`. P `PhotosScreen.tsx:214-221`: no such controls; "Info" calls `openAlbumDialog("", false)` (New album, no item). `library.vibe:53-103` has no single-item change; `setFavorite` has no caller. Also: the viewer's "Add to album" is gone, and Share/Edit show on a trashed item (`shareOne` reads only `main.rows`, `library.vibe:416`). |
| 4 | Viewer swipe, zoom, pan have no control | confirmed | high | L `camera-adapter.ts:240,1808,1839`, `photo-viewport.ts`. P: `library.swipe` (`library.vibe:391`) has no caller in `src/web`; `zoomedTo/pans/doubleTapped` only in `test/camera/stories.test.vibe:10`; viewer is a bare `<img>` (`PhotosScreen.tsx:209`). |
| 5 | Album rename/delete unreachable; remove-from-album missing | confirmed | medium | L `template.html:2101,2221`, `camera-adapter.ts:598`. P: every `openAlbumDialog` passes `""` (`PhotosScreen.tsx:164,193,220`), so `ManageAlbum` never opens; `albums.md:18` `AlbumOp` has no remove; `library.vibe:495-499` maps four ops only, though `photos.vibe:43` keeps `remove`. |
| 6 | Albums are a filter of the loaded window; counts from the window | confirmed | high | L `camera-adapter.ts:606,617` (`library.summary()`, `library.list({album, before})`). P `library.vibe:128-132`, `PhotosScreen.tsx:151-152`; `summary()` and `list({album})` have no album caller. Understated: the window is capped at 600 (`library.md:40,67-68`, same cap as legacy), so album members older than the newest 600 can never appear, not merely "until Show more". |
| 7 | Scan drafts in one localStorage value; legacy drafts not adopted | confirmed | high | L `apps/app/src/browser/scan-draft.ts` over the shared IndexedDB store. P `scanner.vibe:17,84,133-151` over `platform/storage.vibe:12` (`localStorage`, base64 JSON). Upstream store exists and is unused: `eliza-vs/packages/files/src/documents/scan-draft.vibe:126` (`@elizaos/plugin-files`, export `./documents/*`). A failed write reports "Another draft is saved…" (`scanner.vibe:375`). The same localStorage quota holds every other area's stored Machine state. |
| 8 | Stored draft cannot be deleted / is not offered; Close never asks | confirmed (trigger corrected) | medium | L `test/scan-document-drafts.test.mjs:39-73`. P: `scan.md:117-118,160`, `ScanReview.tsx:96`, `scanner.vibe:212-220,399-406`. Correction: within one app run `reopenScan` keeps `draftOwner/draftRevision` (`scan.md:160`), so the next review still autosaves and can delete; it silently overwrites the kept automatic draft. The block (no autosave, no Delete, no notice) starts after an app restart, because the scan Machine is not stored (`layer.vibe:42`) and comes back at revision 0. |
| 9 | Scan re-implements shared document modules and drops behaviour | confirmed | medium | P `scanWork.ts:220` strips characters Helvetica cannot draw; `scanner.vibe:449-466` exports without an encodability check. Upstream refuses with `unsupported-text` (`eliza-vs/packages/files/src/documents/scan-pdf.vibe:72-76,104-109`). Failures say only "Scan failed"/"PDF failed" (`scanner.vibe:128,199`). No camera file imports `@elizaos/plugin-files` (Files does). |
| 10 | Scanned-event suggestion lost most rules and its review step | confirmed | medium | L `ui/documents/scan-event.ts` (772 lines, zones at `:101-223`), `prototype/scan-event-review.ts`. P `scanText.ts:101-120`, `scanner.vibe:307-316`. Understated: `disclosures` is computed and never passed (`ports.vibe` `ScannedEvent` has no such field), so even the inferred year is not disclosed. Calendar's form (`calendar/handoffs.vibe:102-111`, `FromScan`) is the only review. No scan-event module in `eliza-vs`. |
| 11 | Crop area cannot be dragged or reset | confirmed | medium | L `photo-crop.ts`, `template.html:2298`. P `PhotoEditor.tsx:45-52` has only `onKeyDown`; `dragCrop` is reached only through `nudgeCrop` (`imageEdit.ts:85`). On a phone: centred aspect presets only; "free" does nothing. |
| 12 | Grid not virtualised, "Show more" button, thumbnails in Machine state | confirmed | medium | L `photos-view.ts:82-126`, `camera-adapter.ts:1521`. P `PhotoGrid.tsx:71-113` renders every row; `PhotosScreen.tsx:177-179`; `library.vibe:167,196-200,275-278` re-reads the whole window with `thumbnails: true` on each change; `store.thumbnails` has no caller. Bounded by the 600-row window. |
| 13 | Select all and Empty Recently deleted | confirmed | medium | L `camera-adapter.ts:1745,1767`, `template.html:2102`. P: `selectAll` (`library.vibe:386`, `browse.md:79-80`) has no UI caller; no empty-trash event, store method or control. |
| 14 | Video editor preview cannot play | confirmed | medium | P `VideoEditor.tsx:36` `controls={false}`, no control sends `play`/`pause` (`videoEdit.md:74-77`); the frame does not follow the trim handles. |
| 15 | Browser build: whole photo library in one localStorage value | confirmed | low | P `browserPhotos.vibe:11,58-75,148-154` (each image stored twice, videos as base64). Browser build only. |
| 16 | Browser build: recordings ignore zoom/mirror; any mic failure is "denied" | confirmed | low | P `browserCamera.ts:213-224,283-286`; `browserMedia.ts:51`. Browser build only. |
| 17 | Failed library read shows "No photos", no Retry | confirmed | low | L `template.html:2043`. P `PhotosScreen.tsx:167-170`, `library.vibe:174-175`; `refresh` has no UI caller. Leaving and re-entering Photos re-reads. |
| 18 | Text read not bound to its review | confirmed | medium | P `scanner.vibe:113-131` (detached fork, no ticket, no signal), `scanDialogs.md:68` needs only `OcrStarting`. L aborts on dispose (`scan-review.ts:44,59`). A late first read can fill the second review, and its text can then be saved to Notes. |
| 19 | Failed lens switch leaves flash/zoom shown that the camera lost | confirmed | low | P `viewfinder.vibe:393-407` resets the device, then `flip ok:false` leaves the model unchanged (`viewfinder.md:272-273`). |
| 20 | Volume-key shutter state not re-sent after a failed call | confirmed | low | L `camera-controls.ts:68-75`. P `viewfinder.vibe:134-138`. |
| 21 | Browser build: import an image into Photos; save selection locally | confirmed | low | L `camera-adapter.ts:1751` (browser mode only). P `PhotosScreen.tsx:114`; no download path. |
| 22 | Focus target never drawn; browser focus not mapped | confirmed | low | Resolves the auditor's UNVERIFIED: legacy drew it on the phone too (`camera-adapter.ts:1037` `nativeFocus=cameraFocusTarget(...)`). P `CameraView.tsx` has no reticle; `CameraScreen.tsx:66` passes only `focusAt`. |
| 23 | Developer-only screen light and dev focus targets | confirmed | low | L `browser-camera.ts:349,397-402`, both dev specs present. Not in the port; the open-items bullet on unported developer pieces names only Browser's two, so the doc understates. |
| 24 | Saved-copy recovery is silent | confirmed | low | L `template.html:1981`, `camera-adapter.ts:1685`. P `editor.vibe:90-109,132`: recovery runs only when the next editor opens; `recover` has no UI caller. |
| 25 | Browser build: flash cycle, torch read-back, front zoom | confirmed | low | P `browserCamera.ts:67` (`maxZoom: 8`), `:288-290` (no read-back). Browser build only. |
| 26 | Tesseract OCR assets not set up | known_open_item | high | Open items, "Tooling / repository root", bullet "The Tesseract OCR assets are not set up". Still open in both trees: no `apps/app/public/ocr`, `package.json:73` lists only `tesseract.js`; `scanWork.ts:62` loads `/ocr/worker.min.js`. Every text read fails until fixed. |
| 27 | Photos reads always need review | known_open_item | medium | Open items, "Owner decisions", bullet "The assistant's Op set has no Photos read class…". `operations.vibe:72-76`. |
| 28 | No test for a chat that stays open during the reveal | known_open_item | low | Open items, "Unverified in the code-only phase", "No tests". |
| 29 | `camera__agentCapture` `panelLimitMs` unverified | known_open_item | low | Open items, "Generated names", camera. Used at `agentCapture.vibe:76`; declared `agentCapture.md` `pure val panelLimitMs = 2000`. |
| 30 | No Dafny proof for recorder admission and video edit | confirmed | low | Port has 0 `*.proof.dfy` (upstream `eliza-vs/spec` has 194). The legacy `specs/lemma/apps/app/src/browser/video-{capture,edit}.dfy` are still in the port tree but their sources are deleted; `scripts/legacy-retirement.json` says proofs move "beside the area spec", and none did. |
| 31 | Camera tests drive no generated conformance cases and no rendered UI | confirmed | medium | `apps/app/test/drivers/` has notes, telephony, workflows only. `test/camera/*.vibe` holds 46 service/Machine tests (auditor said about 30), none rendered. Open items mention only the reveal test, so the doc understates. |
| 32 | Shell decisions the spec does not state | confirmed | low | `photoGrid.vibe:129-135` (20/500), `scanner.vibe:209`, `bridge.vibe:30`, `viewfinder.vibe:143` (inline copy of `chatCovers`, which `agentCapture.vibe:3,56` does import). |
| 33 | Secure-camera rule is a tautology | confirmed | low | `viewfinder.md:447-456`; the real checks are `scripts/aosp-secure-camera-contract.ts`, `scripts/os-ported/os/secure-camera.mjs`, `test/aosp-secure-camera*.test.mjs` (all present). |

Refuted: none. Fixed uncommitted: none. Deliberate retirement: none.
