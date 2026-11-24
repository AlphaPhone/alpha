# test/browser/photos-clean-controls.spec.ts
- Lines: 149 | Kind: Playwright, chromium, `?mode=dev`; UI journeys (mouse, CDP pinch) with photo seeding and some `/src` plugin calls | Verdict: MERGE test 1 into `journeys/camera-photos.spec.ts`, tests 3-4 into `journeys/files.spec.ts`; DELETE test 2 (duplicate)
- Covers: Photos tools menu holds Select; the Camera album cover uses the saved image; viewer actions sit above the dock; Photo info closes on a downward swipe; "Ask Alpha" attaches the photo to the composer without a selection dialog; the full-screen image preview covers the screen in portrait and landscape, zooms by double-tap/pinch, pans, and keeps the typed draft; custom albums create/fill/rename/delete keep photos; Files → Images shares/saves original bytes, trashes and restores after reload; Files copies selected media into a folder keeping the photo. Duplicates: `photo-albums.spec.ts` test 1 (same album journey), `photo-batch.spec.ts` (share/save), chat image-preview specs. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 77-110 | T4 | Album create/fill/rename/delete duplicates `photo-albums.spec.ts` test 1. | Delete here. | None. |
| 2 | 3-75 | T7 | One 70-line test mixes Photos tools, album cover, viewer, info swipe, Ask Alpha and the chat image preview (zoom, pan, pinch, landscape). | Split: Photos part stays in camera-photos; preview zoom/pan/landscape moves to `journeys/chat.spec.ts` (attachments). | Low. |
| 3 | 130, 132, 135, 147 | T6 | Reads `browserPhotoLibrary.read` and calls `registerPlugin('AlphaFiles').storageEmptyTrash/storageList/storageSelect/attachment` in page. | Assert through Files/Photos UI (Trash shows the item, Restore returns it, folder lists one file whose download matches bytes); drop the direct `storageEmptyTrash({confirmed:false})` refusal probe (unit of the plugin). | Low. |
| 4 | 21 | D10 | Cover detected by `span[style*="background: url"]`. | Role/label-based check or screenshot. | None. |
| 5 | 5-11, 79-84, 115-120, 141 | C3 | Four inline seeds. | Shared `seedPhoto` helper. | None. |

## Proposed end state
Photos journey: tools menu Select, Camera cover, viewer above dock, info swipe-to-close, Ask Alpha attaches the photo. Chat journey: image preview zoom/pan/pinch and landscape coverage with the draft kept. Files journey: share/save original bytes, trash/restore across reload, copy to folder keeps the original. Delete the duplicate album test and the plugin probes.
