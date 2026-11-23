# test/browser/helpers/browser-calendar.ts
- Lines: 65 | Kind: Playwright helper (navigation backdoor + fault injection + one real UI helper) | Verdict: **SPLIT**: keep `chooseCalendarEventAction` (move to `harness/nav.ts`), DELETE the rest
- Covers: selecting the retained/legacy Calendar authority (`android-native`/`browser-local`/`canonical`) by walking React fibers to the shell and calling `vset/openView`; making `BrowserCalendar.list` reject; the visible "Event actions" menu. Duplicates: `helpers/home-calendar.ts` already has `refreshHomeCalendar({fail:true})` for Home's unavailable state. Callers/importers: `openBrowserCalendar` 43 specs, `chooseCalendarEventAction` 20, `selectCalendarSource`/`openRetainedCalendarSource` 4 (`home-daily-overview`, `journey-core-loops.production`, `journey-j04-android.production`, `reminder-notice-taps`), `failBrowserCalendarReads`/`restoreBrowserCalendarReads`/`calendarUnavailable` 2 (`home-attention`, `home-daily-overview`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-33 | A1 (D1/D4), T6, P2 | `openRetainedCalendarSource` walks `__reactContainer$` fibers to find the shell instance and sets `calendarAuthority`. Its own comment calls it "a synthetic upgrade state", i.e. the legacy calendar authority that stage A1 deletes. `openBrowserCalendar` selects the test-mocks browser Calendar store (dev simulator, P7). | Delete with the legacy authority. Specs move to the agent Calendar fixture (`harness/plugins/calendar.ts`). | High blast radius: 43 specs depend on it; most are `dev-calendar-*`/`calendar-*` micro-specs that the calendar journey replaces. |
| 2 | 46-65 | P3 | Replaces `BrowserCalendar.prototype.list` in the page and dispatches `alpha:calendar-preferences`. | Use the calendar port's `fail` flag (exists in `home-calendar.ts`). | Low. |
| 3 | 35-41 | — | `chooseCalendarEventAction` opens the visible event menu and clicks an action: a real UI helper. | Move to `harness/nav.ts` as `calendar.eventAction(name)`. | none |
| 4 | 22, 29, 35 | A8 | "Historical fixture name, retained for … compatibility campaigns", "no longer inline controls". | Delete with the code. | none |

## Proposed end state
File deleted. `chooseCalendarEventAction` lives in `harness/nav.ts`. Home's "Calendar unavailable" state is driven by the
merged calendar fixture's `fail` option. No helper reaches React internals.
