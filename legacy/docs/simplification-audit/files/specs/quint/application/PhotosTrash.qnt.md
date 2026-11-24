# specs/quint/application/PhotosTrash.qnt
- Lines: 61 | Kind: Quint model (live; shares PhotosWindow harness) | Verdict: KEEP + PORT harness
- Covers: Native Photos Recently deleted loader: coalesced reads, hidden clears rows, hidden/disposed replies cannot publish, resume reloads. Duplicates: structurally mirrors PhotosWindow (same start/finish shape, imports its Row helpers). Callers/importers: manifest row (camera-adapter.ts, .eliza photos-view.ts, browser/files.ts); harness specs/quint/refinement/application/photos-trash.mjs (+ photos-trash.md) via test/quint-photos-trash.test.mjs; mentioned by scripts/android-instrumentation.ts

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | Uses compilePhotosWindow (text-marker rewriting of camera-adapter.ts, including `trashLoading = true; const token = ++trashEpoch;`). | PORT with PhotosWindow. | M |
| 2 | manifest | B5 | `browser/files.ts` listed but the abstraction says browser Trash is separate. | Remove from sources. | L |
| 3 | 5-20 | C5 | Same loader skeleton as PhotosWindow; if the product extracts one generic serialized loader, both models can share one module with two instances. | Optional merge after the product refactor. | L |

## Proposed end state
Model unchanged (or merged with PhotosWindow if the loader is generalised); harness imports the controller.
