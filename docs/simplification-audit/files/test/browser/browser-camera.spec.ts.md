# test/browser/browser-camera.spec.ts
- Lines: 103 | Kind: Playwright spec, chromium, 3 tests; mostly UI with a synthetic canvas camera, some `/src` probes | Verdict: MERGE into `journeys/camera-photos.spec.ts`
- Covers: Camera takes a photo (full-storage failure says "Not saved"), Back releases capture, Photos shows it after reload, share-save, favorite, delete and recover; denial shows Retry without a saved photo; leaving while permission is pending stops the late stream. Duplicates: camera/photos journey specs in other chunks (`camera-*`, `photos-*`). Callers/importers: none; imports `helpers/owned-photo.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | P3 | `IDBObjectStore.prototype.add` throws QuotaExceeded on `photos`. | Keep as storage-boundary fault (or CDP quota). | Low. |
| 2 | 23, 44, 47-59 | T6 | Reads `browserPhotoLibrary.list()` to count rows; lines 47-59 run stale-revision and prepared-trash checks entirely through the library API. | Assert via the visible grid; drop lines 47-59 (library internals). | Low. |
| 3 | 28, 82 | ok | `alpha-back` event is the Android Back boundary. | Keep via `harness/nav.ts back()`. | None. |
| 4 | 8-14, 63-68, 88-95 | C5 | Three copies of the getUserMedia stand-in. | One `camera` fixture option (stream/deny/hold). | None. |

## Proposed end state
Three steps in `journeys/camera-photos.spec.ts` on a shared camera fixture: capture-and-library round trip (including the storage-full refusal), denial with Retry, leave-while-pending. No library API calls.
