# test/quint-legacy-google-connect-refinement.test.mjs
- Lines: 13 | Kind: Quint historical comparison (`checkGoogleConnectRefinement` from `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs`, Chromium) | Verdict: DELETE
- Covers: historical Google Connect vs mounted Inbox and Calendar consent (3 traces), 2 pinned mismatches. Duplicates: `GoogleConsentAdmission`, `GoogleCalendarAccessChoice` live models. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6, A1 | Compares a superseded design (source `ef9fbf7cd7`, `specs/quint/legacy/README.md`) with the mounted current renderer and pins `GoogleConnectProposedDirectConsent`, `GoogleConnectCurrentReadOnlyRequest`. Historical evidence, not a live model; DECISIONS D11 retires the family. | Delete with the legacy driver, its `.qnt` and `test/fixtures/quint/*Comparison.qnt`. | Low |
| 2 | all | B5 | Asserts exact mismatch IDs: any renderer fix that removes a difference fails the test. | Gone with the file. | None |
| 3 | 6 | Cost | Starts Chromium and the mounted shell; 360 s budget. | Gone. | None |

## Proposed end state
Deleted with `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs`. The current behaviour it observes is covered by the live Google consent/link models.
