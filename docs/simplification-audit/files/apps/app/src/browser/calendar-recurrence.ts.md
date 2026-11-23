# apps/app/src/browser/calendar-recurrence.ts
- Lines: 32 | Role: pure expansion of a repeating calendar series into occurrences within a range. | Verdict: KEEP (minor)
- Importers: 2 (`calendar-records.ts:3`, `calendar-sync-fields.ts:3` (D4 delete)). Text/path pins: `test/calendar-recurrence.test.mjs`, `test/calendar-view-rules.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C6 | `['none','daily','weekdays','weekly']` also in `calendar.ts:237`, `calendar-backup.ts:29`, `calendar-editor.ts:35`. | `export const calendarRepeats=['none','daily','weekdays','weekly'] as const` and derive `CalendarRepeat` from it. | None |
| 2 | 1 | D13 | `import … from './calendar-time.ts'` with extension while siblings omit it (kept for the Node test loader). | Resolve with the shared Node resolve hook; then drop the extension. | Low |
| 3 | 3-4 | A7 | `RecurringCalendarRecord`, `CalendarOccurrence` exported, no importer outside. | Drop `export`. | None |
| 4 | 12 | C3 | Zone choice `row.allDay?'UTC':row.timeZone\|\|'UTC'` duplicated in `calendar-records.ts:36`. | Export `seriesZone(row)` from here. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CalendarRepeat` | type | 2 | repeat→RRULE map in `calendar-sync-fields.ts:4-8`, `prototype/agent-calendar-adapter.ts:200`, `prototype/calendar-adapter.ts:36` | here |
| `DAY` | const | 5 | `86400000` literal in ~20 calendar lines | export here |

## Proposed end state
32 lines; exports the repeat list, `DAY`, `seriesZone` and occurrence-id helpers used by records/editor/calendar.

## Verification
`test/calendar-recurrence.test.mjs`, `test/calendar-view-rules.test.mjs`, `test/browser/dev-calendar-series.spec.ts`.
