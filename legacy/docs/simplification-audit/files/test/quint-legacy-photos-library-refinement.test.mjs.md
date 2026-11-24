# test/quint-legacy-photos-library-refinement.test.mjs
- Lines: 17 | Kind: Quint historical comparison (`checkPhotosLibraryRefinement` from `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical Photos profiles vs mounted browser Photos (4 traces), 6 pinned mismatches. Duplicates: `PhotosWindow`, `PhotosTrash`, `PhotosOwnedAlbum` live models. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins six `PhotosLibrary*` IDs. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 240 s (≈45 s measured) budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs`. The current behaviour it observes is covered by the live Photos models and `journeys/camera-photos.spec.ts`.
