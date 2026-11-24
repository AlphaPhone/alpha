# test/browser/one-calendar.spec.ts
- Lines: 129 | Kind: Playwright, chromium; UI journey over a page-installed agent/Cloud fixture that monkey-patches `connectionController`, plus `/src` imports for setup | Verdict: MERGE into `journeys/calendar.spec.ts` (merged calendar section)
- Covers: Calendar and Home show one merged feed (built-in calendar plus the Google calendars shown in Google) with no calendar chooser in Google accounts or Settings; a read-only Google calendar offers no edit/delete; without Google only the local calendar shows; a saved reminder appears in an otherwise empty Calendar; reading never writes. Duplicates: `dev-calendar-preferences.spec.ts` (same `installOneCalendar` fixture), Home calendar card specs (`home-calendar-density`, `home-daily-overview`), calendar event-action specs. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-18 | T6 | Reminder created by importing `/src/daily.ts` and calling `DailyApps.scheduleReminder`, then dispatching `alpha:reminders-committed` by hand. | Create it through the Reminders UI; here only assert it shows in Calendar. | Low. |
| 2 | 43, 90 | T6 | Google accounts panel opened via `googleConnectionController.open()` imported from `/src`. | Open it from Settings → Apps → Calendar → Google Calendar. | Low. |
| 3 | 41, 68, 73, 87, 96, 106 | P2 | Back/Home are `dispatchEvent('alpha-back'|'launcher-home')`. | Harness `androidBack()`/`goHome()`. | None. |
| 4 | 29-78 | T4 | Tests 2 and 3 open the same Home card, assert the same four titles and the same "no chooser, GET only" counters; they differ only in which panel they visit. | One test visiting both. | None. |
| 5 | 115-129 | T4 | Editable-event actions overlap the calendar event-edit journey. | Keep only "Google event: Edit, no Delete" if the calendar journey lacks it. | Low. |
| 6 | helper `helpers/one-calendar.ts` | T6, D3 | Fixture replaces `connectionController.getAppRecordClient/getCloudClient/getSnapshot` and serialises its initializer with a hand-written `__name` shim. | Becomes an agent/Cloud stub at the bridge boundary in the shared harness. | Medium: fixture rewrite. |

## Proposed end state
Three cases in `journeys/calendar.spec.ts`: (1) merged feed: Home card leads with the holiday, Calendar shows the read-only source, Settings and Google accounts offer no chooser, every request is a GET; (2) no Google account: local calendar only, "Not connected", no page errors; (3) empty Calendar shows a reminder created through Reminders. `helpers/one-calendar.ts` stays while `dev-calendar-preferences.spec.ts` imports it; its `specs/quint/legacy/google-connect` importer retires with P6.
