# test/browser/reminder-delete-review.spec.ts
- Lines: 56 | Kind: Playwright, chromium + firefox + webkit (`storage-specs.ts:32`), real Calendar "Delete event" → "Delete reminder?" review → Pending deletions panel with `page.clock.install`; 8 modes + 2 widths + 1; failures injected by patching `BrowserDaily.prototype.stageDeletion` | Verdict: **MERGE** 4 cases into `journeys/reminders.spec.ts`; delete the rest
- Covers: reminder deletion is reviewed, staged with a 10 s Undo, completes after the window, pauses across reload, refuses a changed reminder before admission, shows "Unconfirmed" on staging loss; two tabs keep separate Undo intents; a direct cancel without staging is refused; a pre-existing journal cancel stays receipt-only. Duplicates: `durable-delete-undo.spec.ts` covers review → Undo → 10 s → cancelled → reload pause almost exactly (fresh, response-loss, reload-loss here); `reminder-v2-assistant` cancel mode covers agent-proposed deletion. Callers/importers: `scripts/storage-specs.ts`; imports `helpers/browser-calendar`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-38 | T4 | `fresh`, `response-loss`, `reload-loss` duplicate `durable-delete-undo.spec.ts`. | Keep one: merge both into a single delete section. | none |
| 2 | 22-24 | T6 | `legacy` mode calls `DailyApps.operateReminder` directly to prove an unstaged cancel is refused. A plugin-API check, no UI. | Delete, or one case in `test/integration/browser-daily.test.mjs`. | Low |
| 3 | 50-56 | A1 (owner check) | "legacy uncertain deletion" seeds a `reminder_cancel` row in the action journal, the pre-staging deletion path. Current code stages deletions; a fresh install cannot hold such a row. | Delete with the legacy path (confirm no current caller still journals `reminder_cancel` for Calendar deletes). | Low |
| 4 | 41 | T7 | Two widths (412, 1440) for a two-tab storage rule. | One width; screenshot only on failure. | none |
| 5 | 11 | – | `stale` (definite refusal, no "Unconfirmed") and `staging-loss` are unique. | Carry with `fresh` and two-tab Undo. | none |

## Proposed end state
One "delete reminder" section in `journeys/reminders.spec.ts`: review → Undo window → completes; reload pauses; stale refused before
admission; staging loss shows Unconfirmed; two tabs keep separate Undo. `durable-delete-undo.spec.ts` merges into the same section.
File and storage list entry deleted.
