# test/browser/reminder-create-review.spec.ts
- Lines: 68 | Kind: Playwright, chromium + firefox + webkit (`storage-specs.ts:36`), real Calendar "New event → Reminders → Save" UI with `page.clock`; 16 generated modes, each patching `BrowserDaily.prototype.scheduleReminder/listReminders`, `IDBObjectStore.prototype.put`, `Storage.prototype.getItem` or `reminderCreationDocument.editJson` in-page; raw store reads through imports | Verdict: **MERGE** 6 modes into `journeys/reminders.spec.ts`; delete the rest
- Covers: creating a reminder is retained before dispatch, dispatched once, and an unknown outcome is shown as "Unconfirmed" with a status check that never re-dispatches; persistence failure dispatches nothing; navigation after dispatch keeps the result; a newer draft is preserved. Duplicates: `browser-reminder-edit-recovery.spec.ts`, `browser-reminder-recurrence.spec.ts` (recurring), `reminder-refusal-ui.spec.ts` (refusals), `reminder-timing-review.spec.ts` (lost response); `durable-delete-undo` for the deletion analogue. Callers/importers: `scripts/storage-specs.ts`; imports `helpers/calendar-review`, `helpers/browser-calendar`, `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-16 | A1 | `sibling-pending` and `history-navigate` seed or intercept the legacy localStorage key `alpha.browser.reminder-creations.v1`; `history-navigate` patches `Storage.prototype.getItem` to click Back during the legacy read. Both depend on the legacy import (C6) and die with it. | Delete both modes. | none |
| 2 | 18-26 | T6 | `edit-during-retain` wraps `reminderCreationDocument.editJson`. Internal seam. | Delete. | Low |
| 3 | 7-68 | D9 / T7 | One 60-line body with mode branches; 16 modes × 3 browsers = 48 runs. | Keep `fresh`, `double` (duplicate guard), `response-loss` ("Found · Alert unconfirmed"), `missing` (Unconfirmed → Check status → reload keeps it), `navigate-after-dispatch`, `persistence-failure` as separate named steps. Drop `reload-loss`, `mismatch`, `fresh-attempt` (same path as `missing`), `newer-draft`, `changed-repeat-save`, `missing-attempt`, `recurring` (covered by recurrence spec). | Low |
| 4 | 45-67 | T6 | Results read through `reminderDocument.readRaw()` / `reminderCreations()`. | Assert what the user sees: the reminder row in Calendar after reload, status chip text. | Low |
| 5 | – | P1 | Runs in three browsers though the behaviour is not engine-specific beyond IndexedDB. | Keep only the cross-tab storage step in firefox/webkit; this flow runs chromium only. | none |

## Proposed end state
A "create reminder" section in `journeys/reminders.spec.ts` with six named steps on one fixture that injects transport outcomes at
the `DailyApps` bridge (lost response, unknown, held) instead of patching prototypes. File deleted; storage list entry removed.
