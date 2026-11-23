# test/quint-legacy-files-browser-refinement.test.mjs
- Lines: 15 | Kind: Quint historical comparison (`checkFilesBrowserRefinement` from `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical Files design and ablations vs mounted current Files (3 traces) with 3 pinned mismatches. Duplicates: `FilesBrowserController`, `FilesFilter`, `FilesRecentIndex` live models. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins `FilesBrowserHistoricalDownloads`, `…Overwrite`, `…StaleReview`. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 240 s (≈27 s measured) budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs`. The current behaviour it observes is covered by the live Files models and `journeys/files.spec.ts`.
