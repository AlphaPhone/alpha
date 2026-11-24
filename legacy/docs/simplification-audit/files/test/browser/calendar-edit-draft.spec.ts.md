# test/browser/calendar-edit-draft.spec.ts
- Lines: 36 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:13`), 6 tests + loops (8 runs ×3 engines); UI with module seeding and P3 patches (s12 r33, clock) | Verdict: MERGE into `journeys/calendar.spec.ts` (3 cases)
- Covers: inline edits of an event or reminder are retained across reload, resume and save to the same item; restored edits cannot overwrite a newer revision; title-only reminder recovery on another day keeps the schedule; discard needs review; another tab's newer edits win; a committed reminder edit reconciled on reload does not repeat. Duplicates: draft retention logic overlaps `calendar-form-draft.spec.ts` and `browser-reminder-edit-recovery.spec.ts`. Callers/importers: chromium; `scripts/storage-specs.ts`; imports `helpers/calendar-review.ts`, `helpers/browser-calendar.ts`, `calendar-draft-readiness.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | P2 | Seeds via `new BrowserCalendar().save/acknowledgeCreation` and `DailyApps.scheduleReminder` in page. | Harness `seedCalendar({events,reminders})` at the bridge. | None |
| 2 | 21 | P2 | Newer revision written by `calendarDocument.edit` / `daily.operateReminder` with a fake `bindingHash`. | Second page edits through the UI, or the harness storage editor. | Low |
| 3 | 34-35 | P3 | `BrowserDaily.prototype.operateReminder/reminderOperationReceipt` patched to lose the response and forbid replay. | Bridge-level fault (production lane) or drop; reminder replay safety is also in `browser-reminder-edit-recovery.spec.ts`. | Low |
| 4 | — | T4 / P1 | Runs on three engines although nothing here is engine-specific storage (it goes through IndexedDB already covered by `assistant-draft-storage.spec.ts` on three engines). | Chromium only. | Low |
| 5 | 9 | A7 | `status` locator declared, never used. | Drop. | None |

## Proposed end state
In `journeys/calendar.spec.ts`: (1) edit event title → reload → Resume → Save updates the same event (event and reminder parametrised); (2) a newer saved revision makes the restored Save show "Changed" and keeps both; (3) Discard retained edits needs confirmation and leaves the original. Delete this file and its `storage-specs.ts` entry.
