# test/calendar-delete-latch.test.mjs
- Lines: 103 | Kind: transplant (type-strips `prototype/calendar-days.ts` and `prototype/calendar-adapter.ts`, removes imports by regex, runs them in a `vm` context with ~30 injected globals and a fake `Shell`) | Verdict: DELETE; REWRITE as `journeys/calendar.spec.ts` (device calendar delete with an unconfirmed result)
- Covers: an Android device-calendar delete whose result is unknown holds the event (no second dispatch) until a requested refresh shows whether it still exists; a failed or unrelated read keeps the hold. Duplicates: partial in `test/browser/native-calendar-deletion-routing.spec.ts` and `calendar-delete-completion.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10, 27-35 | T2 | Product adapter source evaluated with stubbed globals (`registerPlugin`, `DailyApps`, `presentCalendarIntervals`, 8 recovery openers). Every adapter import change must update the list. | Delete. | Medium until the journey exists |
| 2 | 44-67 | - | Hold + release by refresh that still lists the event; second delete not dispatched. | Journey with the Calendar bridge fake returning `{status:'unknown'}` from `removeScoped`, then "Check again". | Low |
| 3 | 69-86 | - | Lost bridge answer and removed event: same release rule. | Two variants of the journey step (throw / list empty). | Low |
| 4 | 88-103 | - | Loading another range or a failed list keeps the hold. | One journey step (navigate weeks, failing list keeps "Unconfirmed"). | Low |
| 5 | 36 | D2 | The fake `Shell` documents the monkey-patch adapter contract (`vget`/`vset`/`refreshReminders`). | Gone with the adapter refactor. | - |

## Proposed end state
Deleted. `journeys/calendar.spec.ts` gets "unconfirmed device delete is held until checked" (4 steps) using a typed
Calendar bridge fake in `harness/plugins/calendar.ts` that can return `unknown`, throw, or drop the row.
