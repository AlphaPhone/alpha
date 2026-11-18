# test/browser/dev-calendar-response.spec.ts
- Lines: 14 | Kind: Playwright UI on the web-only "Local guest response" dialog (P7), chromium dev build | Verdict: **DELETE**
- Covers: on the browser development calendar, a guest's response (Invited/Going/Maybe/Declined) persists through reload and clears when the guest is removed (same-day and overnight), a recurring response changes one occurrence only, and a stale guest list or failed write leaves the record unchanged. Duplicates: `dev-calendar-meeting-lifecycle.spec.ts:27-31`, `dev-calendar-guests.spec.ts`. Callers/importers: none. 4 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-13 | P7 | Guest responses are shown only when `!Capacitor.isNativePlatform()` (`calendar-adapter.ts:382`) and stored by `browser/calendar-response.ts`. | Delete. | none for the APK. |
| 2 | 5, 7, 10, 13 | P2 | Seeding and reads through `registerPlugin('AlphaCalendar')` and `calendarDocument`. | — | none |
| 3 | 13 | P3 | `IDBObjectStore.prototype.put` patch left installed (never restored). | — | none |

## Proposed end state
File removed.
