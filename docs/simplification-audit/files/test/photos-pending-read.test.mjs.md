# test/photos-pending-read.test.mjs
- Lines: 38 | Kind: transplant (brace-matching slicer on `camera-adapter.ts`, strip types, `vm` with fake globals) | Verdict: DELETE (carry 2 cases into `journeys/camera-photos.spec.ts`)
- Covers: a pending native photo read cannot publish after the catalog is invalidated, Photos is hidden or left, or the adapter is disposed; a reopen after invalidation dispatches a fresh read. Duplicates: `test/browser/photos-pending-read.production.spec.ts` (same name: delayed read, store change during a pending read, deep window after a catalog event). Callers/importers: `npm test`; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8, 16 | T2/T10 | Slices `const retirePhotoRead=`, `async function openSaved(` and `function invalidateLibrary(` out of `camera-adapter.ts` by literal signature and runs them with ~40 hand-set globals. Any rename or the planned `model.js` and adapter split breaks it. | Delete. | none |
| 2 | 20-29 | T4 | A late resolve or reject after invalidation never republishes old pixels, and an old `finally` cannot release the newer guard. The production spec covers the store-change half only. | Carry one case into `journeys/camera-photos.spec.ts`: hold a read (photos bridge), emit a catalog change that removes the item, release the read, expect no stale viewer. | low |
| 3 | 33-38 | T4 | Hidden or departed Photos does not publish, and a queued open after hide starts no read. | Carry one case: hold a read, switch to Home, release, return; expect the grid, no viewer. | low |
| 4 | 30-32 | T4 | "Store change keeps the viewer" duplicates `photos-pending-read.production.spec.ts:21`. | Drop. | none |

## Proposed end state
File deleted. `journeys/camera-photos.spec.ts` (helper `helpers/photos-bridge.ts` with a held-read hook in place of the in-page
`Capacitor.nativePromise` monkey-patch) gains two cases: a stale read after a catalog removal, and a read released after leaving Photos.
