# test/browser/durable-delete-undo.spec.ts
- Lines: 42 | Kind: Playwright, chromium, real UI (Calendar → reminder → Delete → review → Pending deletions panel) with `page.clock`. It seeds through `registerPlugin('DailyApps').scheduleReminder` and asserts on the raw `reminderDocument.readRaw()` in the page (P2/T6, s3/r18) | Verdict: **MERGE into `journeys/reminders.spec.ts`**
- Covers: deleting a reminder is reviewed and then held as a pending deletion with Undo. Undo restores the exact record; after the 10 s window it becomes `cancelled`; a reload pauses the pending deletion instead of completing it. An unknown deletion receipt offers Refresh receipt and Dismiss outcome without changing or retrying the item. Duplicates: the Android deletion coordinator has its own instrumentation; `calendar-delete-completion.spec.ts` covers event deletion. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 17, 23 | T6 | Assertions read `reminderDocument.readRaw()` (status, `pendingDeletion`, `occurrenceId`). | Assert the visible list (the reminder is listed after Undo, gone after expiry, "Deletion paused" after restart), plus one bridge-level read of what `DailyApps` holds. | Low |
| 2 | 31 | P2 | The "unknown" phase is produced by editing the store in the page (`reminderDocument.edit` sets `phase='unknown'`). | Produce it at the bridge: make `DailyApps.operateReminder` return an unknown outcome. If the bridge cannot produce that state, the product cannot either, and the case should go. | Medium |
| 3 | 7 | P2 | It seeds through an in-page `registerPlugin` call, then reloads. | Use the harness seed (`seed.reminders([...])`) before load. | none |
| 4 | 11 | T7 | The undo/expire/restart loop is fine. | Keep it as a parametrized test. | none |

## Proposed end state
A "reminder deletion" block in `journeys/reminders.spec.ts` with the three-mode test and the unknown-receipt test,
seeded and driven at the bridge. The assertions are on visible state plus one bridge read. There are no `/src` imports.
