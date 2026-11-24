# test/retained-reminder-tap-admission.test.mjs
- Lines: 30 | Kind: transplant fixture (`test/fixtures/retained-reminder-tap.mjs` slices `reminder-creations.ts` and strips `reminder-adapter.ts`) + Quint refinement call | Verdict: DELETE
- Covers: a retained reminder notification tap is consumed only after an uninterrupted detail render. Duplicates: `checkRetainedReminderTapAdmission` also runs in `specs/quint/refinement/application/index.mjs:125` via `test/quint-application-refinement.test.mjs` (T4). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-25 | T2 | Scenario tests on the transplant fixture. | Delete. | Low |
| 2 | 27-30 | T4 | Re-runs one component of the application refinement aggregate; asserts an exact trace count (B5). | Delete. | Low |

## Proposed end state
File deleted. The fixture stays while `specs/quint/refinement/application/retained-reminder-tap-admission.mjs` imports
it; that harness is on the T10 port list (import `reminder-adapter`/`reminderEvents` instead of slicing).
