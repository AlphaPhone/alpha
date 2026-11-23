# specs/quint/legacy/PhotosLibrary.qnt
- Lines: 198 | Kind: Quint model, historical view-refresh design translation (five configurations) | Verdict: DELETE (with C17)
- Covers: the 2026-11 photos-library TLA design (windowed list, stale-revision actions, favourite toggle, selection patch). Duplicates: live `application/PhotosWindow.qnt`, `PhotosTrash.qnt`, `PhotoLibraryAgentReview.qnt`, `PhotosOwnedAlbumDialog.qnt`. Callers/importers: `legacy/manifest.json`, `legacy/view-refresh-configurations.json:457`, `test/fixtures/quint/PhotosLibraryComparison.qnt:3`, `legacy/photos-library/check-photos-library-refinement.mjs` (the "photo-library.ts legacy refinement" named in C17), `test/quint-legacy-photos-library-refinement.test.mjs` (~45 s, slowest legacy test).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-198 | P6 | Historical translation; manifest `sources` are only the legacy runner files. | Delete. | Low |
| 2 | — | T4 | `PhotosWindow`/`PhotosTrash` (a real composition) model the current window and trash; this one duplicates the window with a superseded design. | Rely on live models. | Low |
| 3 | — | P1 | Its refinement replay is the single slowest legacy test (45 s) and runs in verify. | Goes with deletion. | — |

## Proposed end state
Removed with the legacy family, together with `PhotosLibraryComparison.qnt`, `legacy/photos-library/**` and its test. Before deleting, confirm `legacy/photos-library/check-photos-library-refinement.mjs` exports nothing a live harness imports (grep at audit time: only `refinement/legacy/index.mjs` and its own test import it).
