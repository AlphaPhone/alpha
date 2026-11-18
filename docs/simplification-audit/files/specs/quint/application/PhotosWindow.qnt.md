# specs/quint/application/PhotosWindow.qnt
- Lines: 85 | Kind: Quint model (live; bundle harness with source rewriting) | Verdict: KEEP + PORT harness
- Covers: Native Photos catalog window: serialized access-then-page reads, coalesced refresh, pagination merge by identity, hidden/disposed fencing. Duplicates: PhotosTrash shares its skeleton. Callers/importers: manifest row (camera-adapter.ts, .eliza photos-view.ts); harness specs/quint/refinement/application/photos-window.mjs (416 lines; exported compilePhotosWindow reused by photos-trash.mjs and photos-owned-album-dialog.mjs) via test/quint-photos-window.test.mjs and test/quint-photos-owned-album.test.mjs; index.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | photos-window.mjs:28-50 | T10 | Bundles camera-adapter.ts (good) but `onLoad` rewrites it: inserts `__ports.inspect=()=>({disposed,captures,loaded,…})` before `'  async function refresh(more = false) {'`, and patches upstream photos-view.ts at `'  let cursor = options.more ? options.cursor : "";'`. | PORT: move the catalog/trash/album state into an exported `createPhotosLibrary(ports)` (camera-adapter split) exposing a read-only `snapshot()`; for the upstream readWindow observe outputs, not internals. | M |
| 2 | harness reuse | - | compilePhotosWindow is the shared fixture for three models; port once. | One port fixes three harnesses. | L |
| 3 | wrappers | T4 | photos-window.mjs is imported by two wrappers. | Fine (different models). | L |

## Proposed end state
Model unchanged; harness drives an exported Photos library controller; no source rewriting.
