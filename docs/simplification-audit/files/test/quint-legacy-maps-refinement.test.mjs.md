# test/quint-legacy-maps-refinement.test.mjs
- Lines: 20 | Kind: Quint historical comparison (`checkMapsRefinement` from `specs/quint/legacy/maps/check-maps-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical Maps vs current mounted browser and Cloud provider over 8 viewport/text-scale sizes, 6 pinned mismatches. Duplicates: Maps live models (MapsConnection, MapPlaneOwnership, MapsEventReturn, MapsRerouteOwnership, MapsScreenSource) and Maps Playwright specs. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins six `MapsHistorical*` IDs and the exact portrait/landscape size list. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 420 s (≈27 s measured) budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/maps/check-maps-refinement.mjs`. The current behaviour it observes is covered by the live Maps models and `journeys/maps.spec.ts`.
