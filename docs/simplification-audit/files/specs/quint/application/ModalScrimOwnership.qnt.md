# specs/quint/application/ModalScrimOwnership.qnt
- Lines: 86 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP
- Covers: chat scrim press ownership vs modal coverage: a covering modal retires captured presses, delayed releases cannot settle a new press, the draft is never activated through a modal (`chat-overlay-motion-adapter.ts`, `calendar-month-focus.ts`, `inline-modal.ts`, `modal-inert.ts`, `phone.css`). Duplicates: `test/modal-scrim-ownership.test.mjs` uses the same Chromium fixture (T4 candidate, host-test chunk). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `modal-scrim-ownership.mjs` only in `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`); fixture `test/fixtures/modal-scrim-chromium.mjs`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture 12-28 | — | Fixture bundles the real modules and `phone.css` and runs them in Chromium: an integration refinement. | Keep. | none |
| 2 | harness 3 | cost | Imports `checkClientFeatures` from `scripts/prepare-client-features.ts` (projection check per run). | Rely on the prepare step having run; drop the import. | L |
| 3 | — | T4 | `test/modal-scrim-ownership.test.mjs` drives the same fixture. | Keep the harness; delete or merge the host test. | L |

## Proposed end state
- Unchanged model and harness; one runner; no projection re-check inside the harness.
