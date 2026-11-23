# scripts/test-reminder-time-flow.ts
- Lines: 59 | Kind: source transplant (inlines `prototype/reminder-adapter.ts`, `runtime/reminder-journal-store.ts`, `runtime/reminder-creations.ts` and upstream `reminder-contract.ts` into one `vm` after regex-rewriting their imports; `DailyApps`, Capacitor, connection store faked) | Verdict: REWRITE as a case in `journeys/reminders.spec.ts`
- Covers: saving a reminder at a nonexistent local time (DST gap, America/New_York) shows "Time skipped (DST)" and never reaches native scheduling; 03:30 the same day schedules once; the chooser subscription is released on unmount. Duplicates: none in Playwright (grep "Time skipped" in `test/browser` finds nothing); Quint `reminder-adapter-fixture.mjs` models adapter states. Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-39 | T2/T10 | Four product files concatenated by regex; any import reformat breaks it. | Playwright with `timezoneId:'America/New_York'`, `page.clock` set before the March DST Sunday, and the harness's DailyApps bridge fake recording `scheduleReminder`. | Low |
| 2 | 58 | T3 | Subscription count on unmount is an implementation detail. | Drop. | None |

Cases worth carrying: 02:30 on the DST Sunday -> toast "Time skipped (DST)", no `scheduleReminder` call; 03:30 -> exactly one call at 03:30 local.

## Proposed end state
Deleted; one case in `journeys/reminders.spec.ts`.
