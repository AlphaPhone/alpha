# test/browser/reminder-decision-review.spec.ts
- Lines: 55 | Kind: Playwright, chromium + firefox + webkit (`storage-specs.ts:33`), real Calendar reminder detail with Complete/Snooze buttons and `page.clock`; 18 generated tests (2 actions × 9 modes) + 3 provider-result tests; seeding through `registerPlugin('DailyApps')`, failures injected by patching `BrowserDaily.prototype` and, in `navigate`, `navigator.locks.request` keyed on an internal lock-name JSON | Verdict: **MERGE** 7 cases into `journeys/reminders.spec.ts`
- Covers: Complete and Snooze on a reviewed reminder dispatch once, refuse when the reminder changed ("Changed"), ignore a duplicate tap, show "Unconfirmed" for an unknown outcome without re-dispatching either action, recover a lost response via "Check reminder action status" and reload, and report provider results "Saved · Alerts off" / "Saved · Alert not set". Duplicates: `browser-reminder-recurrence.spec.ts` (decision idempotency), `reminder-v2-assistant.spec.ts` (agent-proposed complete/snooze), `reminder-timing-review.spec.ts` (snooze lead), `journey-c-alarms.spec.ts`. Callers/importers: `scripts/storage-specs.ts`; imports `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16 | T10 / T6 | `navigate` wraps `navigator.locks.request` and matches the lock name `["browser-document","alpha.browser.documents.v1","alpha.browser.reminder-deletions.v1"]`. Pins an internal lock-name format. | Delete the mode. | Low |
| 2 | 4 | T7 | 2 × 9 modes × 3 browsers = 54 runs. | Carry: `fresh` (done and snooze), `stale`, `duplicate`, `unknown-same-target`, `reload-loss` (done only), plus the three provider results. Drop `response-loss` (same UI as reload-loss), `late-stale`, `navigate`, `navigate-after-dispatch` (covered by the create section). Chromium only. | Low |
| 3 | 9, 24, 29, 42-43 | T6 | Results read through `reminderDocument.readRaw()` and `pendingReminderDeletions()`. | Assert the visible status and the row after reload; keep at most one raw-receipt check at the bridge. | Low |
| 4 | 41 | – | Comment explains a `Done` toast/button ambiguity; the poll on receipts works around a non-unique accessible name. | Report as a UI naming issue; target the toast by role `status`. | none |

## Proposed end state
A "complete and snooze" section in `journeys/reminders.spec.ts`: seven named steps on one seeded reminder with outcomes injected at
the `DailyApps` bridge fixture. File and storage list entry deleted.
