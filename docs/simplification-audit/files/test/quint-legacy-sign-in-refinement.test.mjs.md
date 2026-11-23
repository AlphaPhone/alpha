# test/quint-legacy-sign-in-refinement.test.mjs
- Lines: 14 | Kind: Quint historical comparison (`checkSignInRefinement` from `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical SignIn replays the mounted chooser (3 traces) and pins `SignInHistoricalBootGate`. Duplicates: `quint-signin-refinement`, cloud sign-in host tests. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins `SignInHistoricalBootGate`. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 360 s budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs`. The current behaviour it observes is covered by the live sign-in model and `journeys/connection-cloud.spec.ts`.
