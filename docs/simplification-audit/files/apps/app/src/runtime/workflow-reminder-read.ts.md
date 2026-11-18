# apps/app/src/runtime/workflow-reminder-read.ts
- Lines: 30 | Role: builds the "selected reminders" workflow read for one owner day: open reminders due by day end plus completions inside the day, deduplicated, bounded (`WorkflowReminderOverflow`), revisioned, then validated against the reviewed scope. | Verdict: KEEP (minor SIMPLIFY)
- Importers: `prototype/agent-adapter.ts` (`workflowReminderRows`, `WorkflowReminderOverflow`). Tests: `test/workflow-reminder-read.test.mjs`.
- Text/path pins: `test/support/feature-parity.mjs:629`. User-visible copy at line 5 (overflow messages) must stay.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C6 | `OPEN = new Set(['pending','scheduled','posted','permission-denied','scheduling-failed'])` — the same "open reminder" status set is an inline 6-way OR in `runtime/reminder-creations.ts:34` (that one also admits `'completed'`), and the statuses come from `daily.ts:30` `Reminder.status`. | Export `OPEN_REMINDER_STATUSES` next to the `Reminder` type in `daily.ts` and use it in both. | Low. |
| 2 | 18 | C6 | `reminder.id.startsWith('alarm_')` — alarm-id prefix also in `browser/daily.ts:140,161`, `browser/clock.ts:10`. | `isAlarmId(id)` / `ALARM_ID_PREFIX` in `daily.ts`. | Low. |
| 3 | 27-28 | B3 | Validates the rows this function just built with `validateWorkflowReadResult`, then re-asserts `kind`. Duplicated by the test-only `validateWorkflowReminderResult` in `workflow-device-contract.ts:42-46`. Here it acts as the last gate before reminder data leaves the phone for the agent, so it is defensible. | Keep this one; delete the twin in workflow-device-contract. Optionally drop the `kind` re-check if the upstream validator's return type is narrowed by `operation`. | Low. |
| 4 | 5, 20-22 | D8 | 330-char class line and three dense push lines. | Format; extract `row(reminder, dueAt, status, completedAt?)`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OPEN` | const | 6 | `reminder-creations.ts:34` | `daily.ts` `OPEN_REMINDER_STATUSES` |
| `iso` | helper | 7 | many `new Date(ms).toISOString()` inline | stays (1 line) |
| `'alarm_'` prefix | const | 18 | `browser/daily.ts`, `browser/clock.ts` | `daily.ts` |

## Proposed end state
~35 formatted lines, same behaviour; status set and alarm prefix imported from `daily.ts`.

## Verification
`node --test test/workflow-reminder-read.test.mjs test/workflow-reminder-midnight.test.mjs`; reminder-workflow Playwright journey (`dev-workflow-phone.spec.ts` reminders mode).
