# specs/quint/application/PhotosOwnedAlbumDialog.qnt
- Lines: 119 | Kind: Quint model (live; bundle harness with source rewriting) | Verdict: KEEP + PORT harness
- Covers: Owned album dialog in Photos: stale controls of a replaced dialog do nothing, requests carry the exact album/media revision, a late completion does not close a successor. Duplicates: none. Callers/importers: manifest row (camera-adapter.ts, template.html); harness specs/quint/refinement/application/photos-owned-album-dialog.mjs (uses compilePhotosWindow from photos-window.mjs, renders template.html); wrappers test/quint-photos-owned-album.test.mjs; index.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | Depends on photos-window.mjs `compilePhotosWindow`, which rewrites camera-adapter.ts text at markers (`'  async function refresh(more = false) {'`, `'loading = true; const token = ++libraryEpoch;'`) to expose closure variables. | PORT with PhotosWindow (extract the album/window controller into an exported module). | M |
| 2 | manifest | T10 | `template.html` as a source: any template edit reruns it. | Pin the extracted module only. | L |

## Proposed end state
Model unchanged; harness imports an exported Photos controller instead of rewriting camera-adapter.ts.
