# apps/app/src/browser/calendar-alerts.ts
- Lines: 8 | Role: pure computation of foreground calendar alerts due in the last day, minus dismissed receipts. | Verdict: KEEP (move into a `calendar/` folder)
- Importers: 1 (`browser/calendar.ts:9`). Text/path pins: `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C6 | Alert minutes set `[0,10,60]` also in `calendar.ts:232` (`save` validation) and as option values in `calendar-editor.ts:36`. | Export `CALENDAR_ALERT_MINUTES=[0,10,60] as const` from `calendar-records.ts` and use it in all three. | None |
| 2 | 7 | C3 | `row.timeZone\|\|Intl.DateTimeFormat().resolvedOptions().timeZone` — device-zone fallback repeated across calendar files. | Shared `deviceTimeZone()`. | None |
| 3 | 7 | D8 | One 600-character statement (filter, flatMap, receipt, sort). | Split into `alertStart(row)` and `alertFor(row)` when formatting. | None |
| 4 | 3 | A7 | `export type CalendarAlert` — no importer outside the file. | Drop `export` (return type is inferred by callers). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CalendarAlert` | type | 3 | notification item shapes in `browser/notifications.ts` | keep local |

## Proposed end state
8 lines (≈15 after formatting), shared alert-minute constant and zone helper; lives under `browser/calendar/`.

## Verification
`test/browser/dev-calendar-alerts.spec.ts`, `test/browser/dev-calendar-alert-boundaries.spec.ts`.
