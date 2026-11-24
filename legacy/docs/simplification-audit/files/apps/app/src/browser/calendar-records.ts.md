# apps/app/src/browser/calendar-records.ts
- Lines: 40 | Role: `CalendarRecord` type and pure row operations (lookup incl. computed occurrences, range expansion, replace, delete, once-conversion, exclusion remap). | Verdict: KEEP (minor)
- Importers: 9 (`calendar.ts`, `calendar-alerts.ts`, `calendar-backup.ts`, `calendar-deletions.ts`, `calendar-linked-local.ts`, `calendar-store.ts`, `calendar-sync-fields.ts`, `digest-live-sources.ts`, `prototype/agent-calendar-adapter.ts`). Text/path pins: `test/fixtures/browser-daily-stores.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | C6 | Occurrence id grammar `/^(.*):occ:(-?\d+)$/`; writer `` `${row.id}:occ:${begin}` `` is in `calendar-recurrence.ts:29` and again `calendar-backup.ts:3,37`. | Export `occurrenceId(seriesId,begin)` / `parseOccurrenceId(id)` from `calendar-recurrence.ts`. | None |
| 2 | 36 | C3 | `before.allDay?'UTC':before.timeZone\|\|'UTC'` (twice here, once in `calendar-recurrence.ts:12`). | `seriesZone(row)` in `calendar-recurrence.ts`. | None |
| 3 | 5 | C1 | `CalendarRecord` is the canonical row type; hand subsets exist in `calendar-editor.ts:5` (`EditableCalendarEvent`), `calendar-agent-review.ts:11` (`Existing`), `calendar-recurrence.ts:3` (`RecurringCalendarRecord`). | Derive those with `Pick<CalendarRecord,…>` (recurrence may keep its structural constraint to avoid a cycle). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CalendarRecord` | type | 5 | subsets listed above; agent-side `canonicalCalendarRow` in `prototype/agent-calendar-adapter.ts` | keep here (owner) |

## Proposed end state
~38 lines; shared occurrence-id and zone helpers; becomes `browser/calendar/records.ts` in a calendar folder.

## Verification
`test/calendar-view-rules.test.mjs`, `test/calendar-recurrence.test.mjs`, `test/browser/dev-calendar-series.spec.ts`, `dev-calendar-conversion.spec.ts`.
