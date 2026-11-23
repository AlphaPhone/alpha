# test/browser/helpers/canonical-calendar.ts
- Lines: 189 | Kind: Playwright fixture (read-only CalendarService fake, two transports) | Verdict: **MERGE** into `harness/plugins/calendar.ts` (with `home-calendar.ts` and `one-calendar.ts`)
- Covers: answers `/api/lifeops/calendar/{feed,calendars,next-context}` and `/api/notes/state` read-only for the agent Calendar view; opens Calendar and the New event form without writes. Duplicates: `helpers/home-calendar.ts` and `helpers/one-calendar.ts` build the same calendar/event/next-context records (three copies of the CalendarService shape). Callers/importers: `accessibility-states.ts`, `canonical-calendar-form-review`, `journey-j04-android.production`, `journey-j04-cloud-maps.production`, `maps-event-return-ownership`, `responsive-surfaces.production`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 122-136 | P2, D9 | Two transports: in production it wraps `Capacitor.nativePromise` for `Agent.request`; in dev it imports `connection-ui.tsx` and replaces `getAppRecordClient`, then `c.offline()`. | Answer at the `Agent` bridge only; that works on both builds and removes the `/src` import. | Low. |
| 2 | 17-25 | P13 | Own network fence and own `kind:'offline'` seed. | Harness auto-fixture. | none |
| 3 | 39-120, 150-188 | C3, D8 | Verbose duplicate record builders; `window as Window & {…}` type repeated three times. | One typed `window.__alphaTest.calendar`. | none |
| 4 | 125 | B2 | `typeof options.launcher==='boolean'` toggle for `ElizaSystem.getBuildInfo` is unrelated to Calendar. | Harness `shell:'launcher'` option. | none |

## Proposed end state
`harness/plugins/calendar.ts` exports one `calendarService({events, calendars, googleInFeed, fail, readOnly})` that the
bridge `Agent.request` handler consults, plus `nav.openCalendar()`. Home, One-calendar and canonical Calendar specs all use it.
