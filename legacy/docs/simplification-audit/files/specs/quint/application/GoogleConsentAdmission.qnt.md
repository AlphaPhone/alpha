# specs/quint/application/GoogleConsentAdmission.qnt
- Lines: 94 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (fixture transplant)
- Covers: Google account readback and consent admission in the mounted panel: only the latest same-owner read verifies, unknown readback blocks consent, dispatch keeps at least the held tier (`google-connection-ui.tsx`, `google-accounts.ts`, `gmail-grants.ts`, upstream mailbox grants). Duplicates: same panel as GoogleCalendarAccessChoice; `test/google-calendar-connect.test.mjs` also mounts `google-account-panel.mjs` (T4 candidate, host-test chunk). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `google-consent-admission.mjs` (+ `.md`) via `test/quint-google-consent-admission.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 3 | T2 | Same `test/fixtures/google-account-panel.mjs` text transplant as GoogleCalendarAccessChoice. | Port with the shared real-bundle panel fixture. | M |
| 2 | — | conflict | Fixture is on the C3 delete list. | Delete only after port. | H |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness on the shared panel fixture; `google-account-panel.mjs` gone.
