# apps/app/src/browser/calendar-agent-review.ts
- Lines: 41 | Role: exact review-dialog text for an agent calendar proposal. | Verdict: KEEP
- Importers: 1 (`browser/calendar.ts:16`). Text/path pins: `test/calendar-agent-review.test.mjs` (real import, exact text), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | A7 | `export type CalendarReviewSource` — no importer outside this file. | Drop `export`. | None |
| 2 | 19 | C3 | `Intl.DateTimeFormat().resolvedOptions().timeZone` — device-zone expression repeated 8× in `calendar.ts` and in `calendar-alerts.ts`, `calendar-editor.ts`, `calendar-linked-local.ts`. | One `deviceTimeZone()` helper (calendar module). | None |
| 3 | 10-11 | C1 | `Fields`/`Existing` are hand subsets of upstream `CalendarFields` and `CalendarRecord`. | `Fields=CalendarFields` (upstream calendar-contract), `Existing=Pick<CalendarRecord,'allDay'\|'who'\|'seriesId'>`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Fields` | type | 10 | upstream `CalendarFields` (`.eliza/.../calendar-contract.ts`) | import upstream |
| `Existing` | type | 11 | `CalendarRecord` (`calendar-records.ts:5`) | `Pick<CalendarRecord,…>` |
| `day`/`last` | helper | 13-14 | UTC date formatting in `calendar.ts:271` | keep |

## Proposed end state
Same file, 40 lines, types derived instead of re-declared.

## Verification
`test/calendar-agent-review.test.mjs`, `test/browser/calendar-agent-all-day-review.spec.ts`.
