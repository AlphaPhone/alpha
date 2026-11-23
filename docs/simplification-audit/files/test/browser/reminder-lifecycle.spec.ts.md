# test/browser/reminder-lifecycle.spec.ts
- Lines: 51 | Kind: Playwright, chromium; module-in-page (4 `/src` imports), no user action | Verdict: **DELETE** test 1; **REWRITE** test 2 as a UI step "Reopen a completed reminder" in `journeys/reminders.spec.ts`
- Covers: test 1: 33 past-time creations are refused and retired so nothing stays pending, a later creation succeeds, and a refusal code for a saved ID is never retired; test 2: `reopenSchedule` + `reminder_update` reopens a completed no-alert reminder as a new open occurrence, and "tomorrow" keeps a 5-minute lead. Duplicates: test 1's user-visible half is `reminder-refusal-ui.spec.ts`; refusal copy and listing are in `test/reminder-lifecycle-pure.test.mjs` (host unit, T3). No journey drives the Reopen UI (`reminder-adapter.ts:407` calls `reopenSchedule`): grepped `test/browser` for `Reopen`, only this file and unrelated specs match. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-31 | T6 / T3 | 33 iterations of retain → schedule → retire through module calls. The count is arbitrary and the behaviour is visible in `reminder-refusal-ui`. | Delete. | Low |
| 2 | 32-50 | T6 | Reopen is tested by calling `reopenSchedule` and `operateReminder` with a hand-hashed binding. | Rewrite as a UI step: complete a reminder, choose Reopen (open / tomorrow), check the reopened row and its alert lead. | Medium: only coverage of Reopen |

## Proposed end state
File deleted. `journeys/reminders.spec.ts` gains a "reopen" step driven through the reminder detail menu.
