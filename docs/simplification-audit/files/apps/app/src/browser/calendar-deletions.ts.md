# apps/app/src/browser/calendar-deletions.ts
- Lines: 55 | Role: calendar deletion journal: stage, settle after the undo window, undo, and the guard that blocks edits to rows with a pending deletion. | Verdict: SIMPLIFY
- Importers: 5 (`calendar.ts`, `calendar-store.ts`, `calendar-linked-local.ts` (D4 delete), `deleted-note-origins.ts`, `deletion-recovery.ts`). Text/path pins: `specs/quint/application/manifest.json:2008`, `specs/quint/refinement/application/browser-deletion-poll.mjs`, `test/calendar-deletions.test.mjs`, `test/calendar-empty-bootstrap-repro.test.mjs`, `test/browser/calendar-linked-storage.spec.ts` (D4), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C1 | `journalBinding?:{scope:string;proposalId:string;operationHash:string}` — same literal in `reminder-deletions.ts:6`, `daily.ts:38`, `deletions.ts:22`. | `export type JournalBinding` in `journal-retention.ts`; import it. | None |
| 2 | 16-55 | C5 | Stage/settle/undo/guard is the same algorithm as `reminder-deletions.ts:8-43`, differing only in row lookup and equality. | One generic `deletionJournal<Row>({find, same, remove})` in `journal-retention.ts`; calendar passes `calendarRecord`/`sameRow`/`deleteCalendarRecord`. | Medium (Quint `browser-deletion-poll` maps both) |
| 3 | 24 | C6 | Limit `500` duplicated in `calendar.ts:71`, `daily.ts:41`, `reminder-deletions.ts`. | `DELETION_HISTORY_LIMIT` in `journal-retention.ts`. | None |
| 4 | 5 | A7 | `export type CalendarDeletionTarget` — no importer outside. | Drop `export`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `journalBinding` inline type | type | 6 | `reminder-deletions.ts:6`, `daily.ts:38`, `deletions.ts:22` | `journal-retention.ts` `JournalBinding` |
| `unresolved` | helper | 8 | same predicate in `reminder-deletions.ts` | generic journal |
| `sameRow` | helper | 11-15 | reminder row equality in `reminder-deletions.ts` | keep as the calendar `same` callback |

## Proposed end state
~25 lines of calendar-specific callbacks over a shared deletion journal; shared `JournalBinding` and limit.

## Verification
`test/calendar-deletions.test.mjs`, Quint `browser-deletion-poll` refinement, `test/browser/calendar-delete-*.spec.ts`, `test/browser/reminder-delete-review.spec.ts`.
