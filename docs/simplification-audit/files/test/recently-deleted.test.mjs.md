# test/recently-deleted.test.mjs
- Lines: 46 | Kind: transplant (T2) + source-text (T1) | Verdict: DELETE; REWRITE behaviour into `journeys/camera-photos.spec.ts`
- Covers: Photos Recently Deleted: permanent deletion affects only reviewed revisions, restored/changed items are skipped, cancel consumes the review, Empty trash needs the explicit all intent. Duplicates: Playwright `photo-albums.spec.ts`, `browser-camera.spec.ts`, `photo-order.spec.ts` touch trash deletion. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | T2 | Slices `prototype/browser-camera.ts` from `function selectedMedia(` to `async function selectedMediaRows(` and from ` async prepareDeleteTrash(` to `\n};`, esbuild-transforms and vm-runs it with a fake IndexedDB transaction. | Delete. Cases worth carrying (journey, dev photo library): select one trashed item → delete → only it disappears; restore an item between review and confirm → it survives; Empty trash removes all trashed items. | Medium |
| 2 | 36-46 | T1 | Regexes over upstream `PhotosPlugin.java` (vendor) and `camera-adapter.ts`. | Delete; upstream owns the Java parser. | Low |

## Proposed end state
- File removed; three steps in the camera-photos journey; `browser-camera.ts` split (cross-file-actions U-R15) is unblocked.
