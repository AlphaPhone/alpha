# test/browser/dev-calendar-alert-boundaries.spec.ts
- Lines: 11 | Kind: module-in-page against the browser Calendar/notification stand-ins (P7, T6), chromium dev build | Verdict: **DELETE**
- Covers: the browser development calendar's alert scheduler fires an all-day alert at local civil midnight in two zones and dismissal survives reload; a damaged browser calendar document does not block other browser notices and the dev shade shows "Alerts didn’t load". Duplicates: `dev-calendar-alerts.spec.ts` (date-line all-day case is the same rule). Callers/importers: none. 3 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4, 8-10 | P7 | Everything goes through `registerPlugin('AlphaCalendar'/'AlphaNotifications'/'DailyApps')`, i.e. `apps/app/src/browser/calendar.ts`, `calendar-alerts.ts`, `notifications.ts`. On Android these are native plugins; this tests the development simulator. | Delete. | Low for the APK. |
| 2 | 8 | A1 | Writes the legacy `{version:1, legacy, value}` envelope directly through `browserDocuments.edit`. | — | none |
| 3 | 4, 9-10 | T6 | Assertions on plugin return values; only the "Alerts didn’t load" text is visible UI. | — | none |
| 4 | 3 | T8 | `page.clock.setFixedTime` jumps with real timers (research P10). | — | none |

## Proposed end state
File removed. If the owner keeps the browser development calendar (D19), one dev-surface smoke step ("an event with an alert appears in the dev shade when due") covers it; civil-date alert timing on Android is native code and needs instrumentation, not this spec.
