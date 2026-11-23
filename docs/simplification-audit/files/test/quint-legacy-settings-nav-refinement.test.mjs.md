# test/quint-legacy-settings-nav-refinement.test.mjs
- Lines: 17 | Kind: Quint historical comparison (`checkSettingsNavRefinement` from `specs/quint/legacy/settings-nav/check-settings-nav-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical Settings profiles replay mounted routes (2 receipts) with 5 pinned differences. Duplicates: settings Playwright specs, `settings-model-traces` replays. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins five `SettingsNav*` IDs. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 240 s budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/settings-nav/check-settings-nav-refinement.mjs`. The current behaviour it observes is covered by the settings replays and `journeys/settings.spec.ts`.
