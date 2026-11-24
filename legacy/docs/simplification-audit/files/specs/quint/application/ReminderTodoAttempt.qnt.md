# specs/quint/application/ReminderTodoAttempt.qnt
- Lines: 138 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Undated to-do saves: one reminder write at a time, readback decides, unconfirmed attempt keeps its id so an identical retry never duplicates. Duplicates: none. Callers/importers: `reminder-todo-attempt.mjs` <- `test/quint-reminder-todo-attempt.test.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based bundled adapter. | None. | - |
| 2 | manifest | T10 | 10 symbol pins (`reminderRows` duplicated at end). | File pins only. | L |

## Proposed end state
- Keep unchanged.
