# apps/app/src/runtime/reminder-creations.ts
- Lines: 43 | Role: binds the shared reminder creation journal to Alpha's slot/document and DailyApps; reminder → calendar-event presentation for the Calendar view. | Verdict: SIMPLIFY
- Importers: `prototype/calendar-adapter.ts:14`, `prototype/reminder-adapter.ts:6`; `scripts/test-calendar-crud-review.ts:58-59`, `scripts/test-reminder-time-flow.ts:36`.
- Text/path pins: Quint `calendar-adapter-fixture.mjs:10,41`, `reminder-adapter-fixture.mjs:28`, application/native manifests; tests `reminder-lifecycle-pure`, `scanned-calendar-handoff` (read text), `locale-time-usage`, `quint-reminder-intents`; browser specs `reminder-*`; fixtures `reminder-open-intent.mjs`, `retained-reminder-tap.mjs`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 33 | C1 | `type Bag=Record<string,any>` for `reminderEvents():Bag[]`. | A `CalendarRow` type shared with `calendar-adapter.ts`/model. | Low |
| 2 | 34 | C6 | six-way status OR (`'pending'||'completed'||'scheduled'||'posted'||'permission-denied'||'scheduling-failed'`); `workflow-reminder-read.ts:6` has an `OPEN` set. | `SHOWN_REMINDER_STATUSES` set. | None |
| 3 | 37 | D8 | 700-char object literal with the notes text builder inline. | Extract `reminderNotes(r)`; keep every string exactly (user-visible copy). | Low (Quint fixture re-exports `reminderEvents`) |
| 4 | 11, 18-19, 24, 26 | C1 | `as never` casts between `daily.ts` `Reminder` and the upstream journal row type. | Type the journal with `Reminder` (or align `daily.ts` with upstream). | Low |
| 5 | 27 | D4 | `const dueOf=reminderDueAt` alias. | Use `reminderDueAt`. | None |
| 6 | 13-20 | D4 | renamed aliases of journal methods. | Export `reminderCreationJournal`; callers use methods. | Low (many tests import names) |
| 7 | 6 | A7 | `reminderRefusals` re-export test-only. | Keep or import upstream in the test. | None |
| 8 | 42 | C6 | `appName:'Alpha'` literal. | Registration constant. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 7 | ~60 files | `prototype/shell-types.ts` |
| status set | const | 34 | `workflow-reminder-read.ts:6` `OPEN` | `reminders/` module |
| `dueOf` | alias | 27 | upstream `reminderDueAt` | delete |

## Proposed end state
~35 lines in a `reminders/` folder: journal binding, typed `reminderEvents` with an extracted notes builder, refusal message.

## Verification
Quint reminder/calendar fixtures, `test/reminder-lifecycle-pure.test.mjs`, `test/scanned-calendar-handoff.test.mjs`, browser specs `reminder-create-review`, `reminder-creation-storage`, `reminder-lifecycle`, `reminder-refusal-ui`, `reminder-timing-review`; scripts `test-calendar-crud-review.ts`, `test-reminder-time-flow.ts`.
