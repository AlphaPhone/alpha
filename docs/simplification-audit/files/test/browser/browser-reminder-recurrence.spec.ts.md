# test/browser/browser-reminder-recurrence.spec.ts
- Lines: 95 | Kind: Playwright, chromium (dev server), 5 tests + 1 loop (6 runs); mixed journey + module-in-page (s18 r27, `page.clock`, 1 sleep) | Verdict: MERGE into `journeys/reminders.spec.ts`
- Covers: a zoned daily reminder (America/New_York, phone in Asia/Tokyo) keeps its saved zone across reload and DST, title-only edits keep the schedule, an explicit time edit adopts the phone zone, closing the editor during preparation dispatches nothing. Duplicates: decision idempotency overlaps `reminder-decision-review.spec.ts`, `reminder-timing-review.spec.ts`; editor-close cancellation overlaps `browser-reminder-edit-recovery.spec.ts`. Callers/importers: run by the chromium project only (not in `scripts/storage-specs.ts`); imports `helpers/browser-calendar.ts` (`chooseCalendarEventAction`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-29, 37-43 | T6 / P2 | Tests 1-2 seed and decide through `registerPlugin('DailyApps').scheduleReminder/reminderDecision/listReminders` and read `reminderDocument.readRaw()`; no user action until line 32. They assert the web `DailyApps` stand-in's decision semantics (`'unchanged'`, `'stale'`), which the APK replaces with the native plugin. | Drop the plugin-level decision matrix; keep one UI case: seeded zoned reminder, reload, "Complete reminder occurrence", next occurrence shows the DST-correct time. | Low: native decision semantics are covered by Android instrumentation, not here. |
| 2 | 82, 92 | P3 | `BrowserDaily.prototype.operateReminder=…`, `BrowserDaily.prototype.scheduleReminder=…throw`, and `crypto.subtle.digest=` patched to hold until a string contains `reminder_update`. Renames silently disable the hold. | Drop the `crypto.subtle` hold case entirely (`browser-reminder-edit-recovery.spec.ts` covers close-during-save); assert test 77 via the stored row only. | Low |
| 3 | 5, 48, 78, 88 | T7 / C6 | `alpha.connection.selection.v1={kind:'offline'}` seeded inline four times (test 2 omits it). | Harness fixture default. | None |
| 4 | 57, 64, 70-71 | P2 | Reads `reminderDocument.readRaw()` via in-page import to compare fields. | Assert visible time/title after reload; if a storage assertion is kept, read through one harness `storage.read(key)`. | Low |
| 5 | 94 | T8 | `waitForTimeout(150)` after release. | `expect.poll` on dispatch count. | None |

## Proposed end state
Two or three cases in `journeys/reminders.spec.ts` (chromium, `timezoneId:'Asia/Tokyo'`, fixed clock): (1) zoned daily reminder survives reload and completing it advances across the DST gap; (2) title-only edit keeps zone and occurrence (both DST scenarios as one parametrised case); (3) explicit "Start later" edit adopts the phone zone. Seeding through one harness `seedReminder()`; no prototype patches; no `crypto.subtle` hooks. Delete this file.
