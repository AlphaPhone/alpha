# test/browser/browser-reminder-edit-recovery.spec.ts
- Lines: 82 | Kind: Playwright spec, chromium + firefox/webkit (`scripts/storage-specs.ts:34`), ~22 tests via loops; UI editor plus `BrowserDaily.prototype` patches and store reads | Verdict: REWRITE as steps in `journeys/reminders.spec.ts` (few cases), delete the rest
- Covers: editing a reminder from Calendar: a stale rendered schedule never overwrites a newer canonical edit; lost commit/receipt survives reload without replay; completed-reminder metadata vs reschedule review; no dispatch before the durable intent is stored; completion ownership after dispatch; receipt boundary; native-shaped receipt statuses. Duplicates: `host-reminder-recovery.spec.ts`, `reminder-*` specs (other chunks), host tests of `reminder-deletions.ts`. Callers/importers: `scripts/storage-specs.ts`; imports `helpers/calendar-review.ts`, `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21, 45, 53, 64, 72, 77 | P3 | Six different `BrowserDaily.prototype.operateReminder`/`reminderOperationReceipt` patches, plus `crypto.subtle.digest`, `navigator.locks.request` and `IDBObjectStore.prototype.put` patches to hold or fail internal steps. | Inject failures at the `DailyApps` bridge (production stub): lose the response, fail the receipt, return a status. Drop cases that need to pause hashing or locks. | Medium. |
| 2 | 8-9, 14, 16, 23 … | P2/T6 | Reminders scheduled and read through `registerPlugin('DailyApps')`, `reminderDocument.readRaw()`, `pendingReminderDeletions()`. | Seed via the bridge stub; assert visible event row and recorded bridge calls. | Medium. |
| 3 | 7 | P10 | `clock.setFixedTime` with real timers. | `clock.install` per harness policy. | Low. |
| 4 | 43-74 | T4/T3 | Nine scenarios proving internal ordering of durable intent vs dispatch. | Keep one: navigate away during a pending save → no duplicate dispatch. | Medium. |
| 5 | n/a | P8 | Three engines. | Remove from `storage-specs.ts`. | None. |

Cases worth carrying: stale editor save does not overwrite a newer edit (stub reports a newer revision); lost commit reply → "Unconfirmed", second Save does not dispatch again, reload settles; completed reminder: metadata edit keeps completion, reschedule asks for review and reopens; native receipt `permission-denied` / `scheduling-failed` show "Saved · Alerts off" / "Saved · Alert not set".

## Proposed end state
File deleted; four or five steps in `journeys/reminders.spec.ts` on the production DailyApps stub. No prototype patches; one clock policy.
