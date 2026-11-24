# test/quint-historical-camera-session.test.mjs
- Lines: 14 | Kind: Quint historical comparison (`checkHistoricalCameraSession` from `specs/quint/refinement/legacy/camera-session.mjs`, Chromium) | Verdict: DELETE
- Covers: current mounted Camera matches selected original session transitions (4 traces). Duplicates: camera Playwright specs; `CopyReceipt` and camera-preview-retirement live models. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins trace/obligation counts. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 240 s budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/refinement/legacy/camera-session.mjs`. The current behaviour it observes is covered by the camera Playwright specs and live camera models.
