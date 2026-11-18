# test/browser/reminder-v2-assistant.spec.ts
- Lines: 178 | Kind: Playwright, chromium (`?mode=dev`), real chat send → proposal review → approve over a paired development agent; 21 generated tests (8 v1 + 13 v2); inline 70-line bridge; seeds the reminder through the legacy localStorage key; imports `presentDeviceRecordOperation` from product code in the Node test process to compute expected labels | Verdict: **MERGE** into `journeys/chat.spec.ts` ("agent reminder proposals"); delete the v1 cases subject to the owner question
- Covers: with reminder context selected, the client negotiates `reminders.local-record.v2`, sends the selection without private details, and an approved agent proposal reads/updates/completes/snoozes/cancels exactly that reminder with one journal reservation and a receipt; stale proposals fail; no-alert snooze is refused without change; recurring complete advances one occurrence and a replay is idempotent; an older peer or unsupported `reminder_create` is explained and never approved; state survives reload. Duplicates: the bridge duplicates `proposal-recovery.spec.ts:8-74`; cancel overlaps `reminder-delete-review` (staged Undo); snooze/complete overlap `reminder-decision-review`. Callers/importers: imports `helpers/connection-diagnostics`, `app-navigation`, and `apps/app/src/runtime/device-record-presentation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21 | A1 | Seeds the selected reminder by writing `alpha.browser.reminders.v1` to localStorage, which only reaches the store through the legacy import (C6). Breaks when that reader is deleted. | Seed through the `DailyApps` fixture (`scheduleReminder`) before load, as `reminder-decision-review` does. | Medium: setup only |
| 2 | 9, 12 | A1 (owner check) | Eight v1 cases ("legacy reminder (no alertMinutes, no timingVersion) and a v1-only peer"). The resident agent ships with the same build, so a v1-only peer and v1 records should not exist. | Owner question; if confirmed, delete the v1 cases with the v1 client path. | Medium |
| 3 | 2, 139-140 | T6 | Expected approval label computed by importing the product's `presentDeviceRecordOperation`; a wrong label passes. | Hard-code the expected titles per operation. | none |
| 4 | 18-87 | C3 / C5 | Inline bridge (pairing, proposals, journal) copied from `proposal-recovery`. | Use `harness/plugins/agent-proposals.ts` (see `proposal-recovery.spec.ts.md`). | Low |
| 5 | 119, 134, 136, 145, 154, 176 | T6 | Results read and stale edits written through `reminderDocument` imports; cancel recovery checked via `deletions.receipt`. | Assert the reminder row in Calendar after reload; inject the stale change through the `DailyApps` fixture. | Low |
| 6 | 148-149 | T8 | 20 s polls for the cancel to complete after the 10 s Undo window, on the real clock. | Install `page.clock` and fast-forward, as `reminder-delete-review` does. | Low |

## Proposed end state
A describe in `journeys/chat.spec.ts` with the v2 modes (read, update, complete, snooze-alert, no-alert snooze refused, cancel with
Undo, stale, recurring complete + replay, older peer, unsupported create) on the shared agent-proposal fixture with literal labels
and a fake clock. v1 cases go once the owner confirms v1 is legacy.
