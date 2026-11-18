# apps/app/src/prototype/locale-time.ts
- Lines: 95 | Role: device-locale and 12/24-hour date/time formatting with a formatter cache and live weekday/month name tables. | Verdict: MOVE to `apps/app/src/runtime/locale-time.ts` (content KEEP)
- Importers: 17 app files – `main.tsx:83` (`setLocalePreferences`), `model.js:26` (12 names incl. `WEEKDAYS, MONTHS`), prototype `calendar-approval-fields.ts`, `calendar-interval-presentation.ts`, `canonical-notes-ui.ts`, `data-adapter.ts`, `home-cards.ts`, `inbox-cloud-adapter.ts`, `notifications-adapter.ts`, `phone-adapter.ts`, `reminder-adapter.ts`, `sms-adapter.ts`, `telephony-presenters.ts`, `workflow-adapter.ts`, and three **runtime** modules reaching up into `../prototype/`: `runtime/hosted-digest-ui.tsx:55`, `runtime/subscription-entitlement.ts:26`, `runtime/workflow-local-time.ts:3`. Scripts: `scripts/fixtures/calendar-adapter.ts:4`, `scripts/inbox-adapter-fixture.ts:9`, `scripts/test-inbox-cloud-flow.ts:7`, `scripts/workflow-renderer-fixture.ts:16`. Tests: `test/locale-time.test.mjs`, `home-cards.test.mjs`, `telephony-presenters.test.mjs`, `calendar-approval-ui.test.mjs`, `calendar-day-context.test.mjs`, `home-overview-cards.test.mjs`, `workflow-definition-bounds.test.mjs`, `polish-automation-when.test.mjs`, browser `home-daily-overview.spec.ts:33`, `digest-summary.spec.ts:6`.
  Text/path pins: `test/locale-time-usage.test.mjs:6,60-69` (walks sources, skips `prototype/locale-time.ts` by path, T1), `test/support/feature-parity.mjs:383`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | D11 | Pure runtime/domain module in `prototype/`; three `runtime/` files import `../prototype/locale-time` (wrong dependency direction). Research §5 lists it as misplaced. | `git mv` to `runtime/locale-time.ts`; update ~21 importers and the path pins (`locale-time-usage.test.mjs` skip path, feature-parity, scripts, tests). | Low (mechanical) |
| 2 | 6, 69-70, 89-90 | A7 | `export type HourCycle`, `export function monthName`, `weekdayNames`, `monthNames` have no importer outside this file (`git grep -lw` over apps/scripts/test/specs: 0). They are used internally by `refreshNames`. | Drop the `export` keyword (keep the functions). | None |
| 3 | 18 | B1 (kept) | `try { locale = Intl.getCanonicalLocales(locale)[0]; } catch { locale = undefined; }` – the value comes from the native `System.getLocaleInfo()` (trust boundary), fallback to runtime default is the specified behaviour. | Keep; add "invalid native tag → device default" to the comment. | — |
| 4 | 16-19 | B3 (kept) | `unknown` inputs validated – correct at the native boundary (`main.tsx:340`). | Keep. | — |
| 5 | 12-13, 91-95 | NEW (mutable exported arrays) | `WEEKDAYS`/`MONTHS` are exported mutable arrays refilled in place so `model.js` (`var DAYS = WEEKDAYS`) keeps a live reference. | Keep while model.js uses `DAYS[...]`; when model.js is split, replace with `weekdayName(date)` calls and delete the live tables. | Low |
| 6 | — | C3 | `inbox-cloud-adapter.ts:919-920` builds "today → time, else month/day" locally; `telephony-presenters.ts` has a similar rule. | Add `formatListTime(date, now)` here and reuse. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `HourCycle` | type | 6 | none | stays (unexported) |
| `format` cache | helper | 28-38 | none | stays |
| `clean` | helper | 40 | none | stays |
| `at` | helper | 41-45 | decimal-hour → Date conversions in `model.js` calendar code | stays |

## Proposed end state
`runtime/locale-time.ts`, ~93 lines, four fewer exports, plus `formatListTime`. No behaviour change.

## Verification
`test/locale-time.test.mjs`, `test/locale-time-usage.test.mjs` (path), `test/home-cards.test.mjs`, `test/telephony-presenters.test.mjs`, `test/calendar-day-context.test.mjs`, `test/workflow-definition-bounds.test.mjs`, browser `home-daily-overview.spec.ts`; `npx tsc` and `npm run verify`.
