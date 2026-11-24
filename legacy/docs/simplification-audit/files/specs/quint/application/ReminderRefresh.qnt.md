# specs/quint/application/ReminderRefresh.qnt
- Lines: 102 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Calendar reminder refresh: only the newest refresh publishes, device rows publish even when the reminder store fails, the notification open intent is settled by the newest refresh. Duplicates: ReminderOpenIntent (open intent detail). Callers/importers: `reminder-refresh.mjs` <- `test/quint-reminder-refresh.test.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based bundled adapter; sources include `calendar-adapter.ts` (pins `refreshReminders`, `nativeCalendarRows`). | None. | - |
| 2 | manifest | T10 | 10 symbol pins; `calendar-adapter.ts` is touched by the D4 Calendar deletions, pins there will churn. | File pins only. | L |

## Proposed end state
- Keep unchanged. Re-check `sources` after the D4 calendar-adapter cleanup (Stage A1) still lists live files.
