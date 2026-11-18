# test/browser/helpers/owned-photo.ts
- Lines: 35 | Kind: Playwright helpers: one seeding backdoor, three UI menu helpers | Verdict: **SPLIT**: menu helpers MERGE into `harness/nav.ts`; `openOwnedPhotoViewer` REWRITE on `harness/plugins/photos.ts`
- Covers: seeds one browser-owned photo through `importBrowserPhoto` and opens the viewer; opens Photos tools / single-photo actions / Share. Duplicates: `photos-bridge.ts` seeds photos at the bridge instead. Callers/importers: 13 specs (`openOwnedPhotoViewer`: `accessibility-resilience`, `accessibility-states.ts`; menu helpers: `browser-camera`, `context-selection`, `dev-image-question`, `large-text-overlap`, `photo-album-accessibility`, `photo-albums`, `photo-batch`, `photo-email`, `photo-overlay-contrast`, `photo-permitted-batch`, `video-edit`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T6, P2 | `page.evaluate(import('/src/prototype/browser-camera.ts'))` → `importBrowserPhoto(...)`: writes through a product function instead of the UI or the bridge. | Seed through `harness/plugins/photos.ts` (`AlphaPhotos.list`). | Low. |
| 2 | 19-35 | — | Role/label-based menu helpers with open-state check. Good. | Move to `harness/nav.ts`. | none |

## Proposed end state
`nav.openPhotoTools()`, `nav.choosePhotoAction(name)`, `nav.openPhotoShare()` in `harness/nav.ts`; the viewer seed is a
`photos` fixture option. File deleted.
