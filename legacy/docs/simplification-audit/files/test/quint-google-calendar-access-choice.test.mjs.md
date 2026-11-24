# test/quint-google-calendar-access-choice.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper (calls `checkGoogleCalendarAccessChoice` from `specs/quint/refinement/application/google-calendar-access-choice.mjs`) | Verdict: DELETE
- Covers: Calendar access choice belongs to the verified account read and current intent (17 traces; `google-connection-ui.tsx`). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T4, P3 | Second execution of a campaign the application aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-12 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | Cross-file | Driver (and `google-consent-admission.mjs`) imports `test/fixtures/google-account-panel.mjs`, which delete-candidates C3 lists for deletion with the Calendar sync stack. | Do not delete that fixture; move it to `specs/quint/refinement/application/fixtures/`. | High |

## Proposed end state
Deleted. `GoogleCalendarAccessChoice` keeps running once through the application campaign list in the manifest runner.
