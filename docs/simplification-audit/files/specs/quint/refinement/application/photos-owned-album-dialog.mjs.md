# specs/quint/refinement/application/photos-owned-album-dialog.mjs
- Lines: 159 | Kind: Quint refinement harness over the bundled real `camera-adapter.ts` (via `photos-window.mjs`, import-based with stubbed ports) | Verdict: KEEP
- Covers: Photos owned-album create/rename/delete dialog: retained controls from a replaced dialog are inert, one pending dispatch, hidden/departed/disposed renderer cannot dispatch or publish, add-selection uses the shown revisions. Model `PhotosOwnedAlbumDialog.qnt`.
- Duplicates: `test/quint-photos-owned-album.test.mjs` adds example tests repeating the first schedules (T4); Playwright `test/browser/photo-albums.spec.ts` and `photo-album-accessibility.spec.ts` drive album UI in Chromium. Importers: `test/quint-photos-owned-album.test.mjs` (also imports `createOwnedAlbumFixture`), `index.mjs:49`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 60-62 | B5 | Captures `template.html` and the model as hashed inputs though neither is executed here. | Drop. | Low. |
| 2 | 12 | T4 | `createOwnedAlbumFixture` is exported only so the wrapper test can run example tests that duplicate scenarios 1-3. | Delete the example tests; un-export. | Low. |
| 3 | 36-37 | — | Drives private render-model handles (`tiles`, `alb.manage`, `am`) rather than DOM. Acceptable at the adapter boundary until the camera adapter split. | Revisit with the `camera-adapter.ts` split. | Low. |

## Proposed end state
Unchanged campaign (10 schedules), no duplicate example tests, one test entry.
