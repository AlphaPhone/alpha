# test/locale-time.test.mjs
- Lines: 84 | Kind: unit (real import of `apps/app/src/prototype/locale-time.ts`) + source-text (66-74) | Verdict: REWRITE as cases in `journeys/settings.spec.ts` (locale); DELETE the rest
- Covers: device locale and Android 12/24-hour choice drive every displayed time/date/range. Duplicates: partial in `test/home-cards.test.mjs`, `test/calendar-day-context.test.mjs`, `test/telephony-presenters.test.mjs`, `test/browser/home-daily-overview.spec.ts` (they call the same formatters). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 66-74 | T1 | Regexes over `model.js` for hard-coded weekday/month arrays and AM/PM code. | Delete. | None |
| 2 | 7-65, 76-84 | T3 | Pure formatter unit tests with a module-global preference setter. Real, visible behaviour (hour cycle is not visible to a WebView's Intl). | Carry 4 cases into a journey: en-GB + h23 clock shows `15:04`; en-GB + h12 shows `3:04 pm` (locale kept); de-DE shows German weekday/month in Calendar; en-US range `3:00 – 4:00 PM` shares the period. The journey sets the hour cycle through the native preference bridge fake used by the settings harness and `test.use({locale})`. | Low |
| 3 | 40-43 | B3 | Invalid-locale fallback only asserts `typeof === 'string'`; tests nothing. | Drop. | None |
| 4 | 77 | - | `formatFullDateTime(Invalid Date)` → "Date unavailable" is a visible string. | Carry as one assertion in the inbox message-details journey if that UI shows it. | Low |

## Proposed end state
File deleted. `journeys/settings.spec.ts` (locale/hour-cycle section) drives three or four visible screens (clock, calendar day header,
an event time range) under en-GB/h23, en-GB/h12, de-DE and en-US. No direct import of `locale-time.ts` from tests.
