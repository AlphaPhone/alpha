# test/browser/dev-calendar-guests.spec.ts
- Lines: 17 | Kind: Playwright on the browser calendar stand-in's editor (P7), chromium dev build | Verdict: **DELETE**
- Covers: the browser development calendar editor saves guest changes, prunes responses of removed guests, persists meeting-room and alert controls, limits occurrence guest edits to that occurrence, keeps selections after a failed save, and receives Calendar contact choices for an all-day event. Duplicates: `dev-calendar-response.spec.ts` (responses), `dev-calendar-meeting.spec.ts` (attendees + video). Callers/importers: none. 4 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-16 | P7 / P2 | Seeds and opens the stand-in editor through `registerPlugin('AlphaCalendar').save/edit` and edits `calendarDocument` directly. Guests, responses and the "Local meeting room" are web-only features (`calendar-adapter.ts:382-383` gate them on `!Capacitor.isNativePlatform()`). | Delete. | none for the APK. |
| 2 | 13 | P3 | `IDBObjectStore.prototype.put` patch. | — | none |
| 3 | 16 | B5 | Unused screenshot. | — | none |

## Proposed end state
File removed. If the owner removes the web-only guest/meeting features from the dev simulator (D19), nothing else references them.
