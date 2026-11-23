# test/browser/dev-calendar-meeting.spec.ts
- Lines: 16 | Kind: Playwright UI + plugin calls on the web-only meeting preview (P7), chromium dev build | Verdict: **DELETE**
- Covers: on the browser development calendar, attendees and the video option persist through creation, edit and reload, and Join opens a meeting room showing them; the room requests media only on demand, releases both sensors on Leave, releases a late-granted camera, and stays usable when sensors are denied. Duplicates: `dev-calendar-meeting-lifecycle.spec.ts`, `dev-calendar-guests.spec.ts`. Callers/importers: none. 4 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-15 | P7 | Join/meeting room exists only on web (`calendar-adapter.ts:383`, `browser/calendar-meeting.ts`). | Delete. | none for the APK. |
| 2 | 5, 7 | P2 | `calendarDocument.readRaw()` and `registerPlugin('AlphaCalendar').open/joinMeeting`. | — | none |
| 3 | 3 | B4 | Same no-op `navigator.mediaDevices` redefinition as the lifecycle spec. | — | none |
| 4 | 5 | B5 | Unused screenshot. | — | none |

## Proposed end state
File removed (see `dev-calendar-meeting-lifecycle.spec.ts` for the dev-smoke option).
