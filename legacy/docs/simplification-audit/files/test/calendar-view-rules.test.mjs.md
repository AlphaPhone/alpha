# test/calendar-view-rules.test.mjs
- Lines: 183 | Kind: transplant (six product files type-stripped with imports/exports regex-removed and run in `vm` contexts with fake `Date`, timers, `Capacitor`, `DailyApps`, provider and `Shell`: `calendar-days.ts`, `calendar-form-draft-adapter.ts`, `reminder-adapter.ts`, `calendar-adapter.ts`, `browser/clock.ts`, `browser/calendar-recurrence.ts`) | Verdict: DELETE; REWRITE three cases into `journeys/calendar.spec.ts` / `journeys/reminders.spec.ts`, one into `test/integration/calendar.test.ts`
- Covers: midnight arithmetic; an unretained form's day shifts at midnight; device rows still show when the reminder store fails; device calendar and reminders are re-read just after midnight and the timer stops with the view; the browser alarm poll runs only while visible; a skipped recurrence date is emitted once. Duplicates: `test/calendar-recurrence.test.mjs` (recurrence), `test/browser/dev-calendar-navigation.spec.ts` (day navigation). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 20, 37, 82, 118, 153, 174 | T2 | Seven `vm.runInContext` transplants with up to 25 injected globals each. | Delete. | Medium until journeys exist |
| 2 | 24-71 | T3 | Midnight and form day-shift rules. | Journey with Playwright clock (`page.clock.install`): open a new reminder for tomorrow at 23:30, advance past midnight, the form says today. | Low |
| 3 | 74-98 | - | Reminder store failure keeps device rows visible with a stale notice. | Journey step in `journeys/reminders.spec.ts` (DailyApps fake throws on deletion reconcile). | Low |
| 4 | 127-144 | - | Re-read after local midnight, re-arm, no work after unmount. | Journey step with clock advance in Calendar. | Low |
| 5 | 146-166 | - | Alarm poll only while visible. | Journey step: `page.evaluate` visibility via `document.hidden` emulation is awkward; acceptable loss or keep as an integration case over a real `BrowserClock` import once `clock.ts` imports cleanly. | Medium |
| 6 | 168-183 | T4 | Recurrence skipped date via stubbed `calendarInstant`. | Move to `calendar-recurrence` table through the real module. | None |
| 7 | 18-22, 101-125 | C5 | Second copy of the `deviceCalendar()` harness in `calendar-delete-latch.test.mjs`. | Both deleted. | - |

## Proposed end state
Deleted. Midnight, reminder-failure and alarm-visibility behaviours become journey steps on one Calendar/Reminders
fake with Playwright's clock; the skipped-date recurrence case joins the recurrence table in calendar integration.
