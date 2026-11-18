# test/quint-legacy-notes-view-refinement.test.mjs
- Lines: 16 | Kind: Quint historical comparison (`checkNotesViewRefinement` from `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical Notes profiles vs mounted canonical, retained and recording routes (5 traces), 4 pinned mismatches. Duplicates: canonical-notes live models. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins `NotesViewCanonicalCollectionRevision`, `NotesViewHistoricalRestoreFolder`, `…RecordingCap`, `…LiveDurability`. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 240 s (≈40 s measured) budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`. The current behaviour it observes is covered by the canonical-notes models and `journeys/notes.spec.ts`.
