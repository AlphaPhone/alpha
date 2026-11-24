# test/calendar-end-after-start.test.mjs
- Lines: 15 | Kind: unit (real `runtime/calendar-form-draft.ts`, `calendarFormTimeProblem`) | Verdict: DELETE (T4); carry the DST-gap message into `journeys/calendar.spec.ts`
- Covers: an end not after start says "Choose an end time after the start"; only a real DST gap blames the clocks. Duplicates: `test/browser/calendar-end-after-start.spec.ts` (same name; line 6 of this file points to it). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4 | Host twin of a Playwright spec with the same name (tests-host research list of 23 pairs). | Delete. | Low |
| 2 | 13 | - | The DST gap (`gap: problem(null, …)`) message is the case the spec does not show (spec line 17 checks the end message only). | Add one step in the Calendar journey with `timezoneId:'America/New_York'` choosing 02:30 on the spring-forward date. | Low |
| 3 | 3-6 | A8 | Comment narrates history ("Before this check…"). | Gone. | - |

## Proposed end state
Deleted. `journeys/calendar.spec.ts` covers end-before-start and the spring-forward gap message.
