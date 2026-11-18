# test/browser/calendar-form-draft.spec.ts
- Lines: 78 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:9`), 13 tests + loop (14 runs ×3); UI with draft-store reads, P3 patches, an inline IndexedDB hold (s11 r77, clock) | Verdict: MERGE into `journeys/calendar.spec.ts` (5 cases)
- Covers: the unsaved New event form is retained across reload/midnight/restart without creating an item; a successful save clears it; competing tabs need explicit restore; uncertain saves recover without replay; oversized edits stay visible; reopening restores fields without a dialog; discard needs confirmation and respects a newer tab; damaged retained form can be reset without touching events; queued discard keeps newer edits. Duplicates: lost-response recovery in `calendar-creation-recovery.spec.ts:8-14`; draft-store contract in `assistant-draft-storage.spec.ts` (three engines). Callers/importers: chromium; `scripts/storage-specs.ts`; imports `helpers/calendar-review.ts`, `helpers/browser-calendar.ts`, `calendar-draft-readiness.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 64 | P2 | `assistantDraftStore(JSON.stringify(['calendar-creation-form','app']))` read/written in page; pins the binding tuple. | Assert via reload + visible values; corrupt-draft case seeds through the harness storage writer. | Low |
| 2 | 29, 35, 37 | P3 | `BrowserCalendar.prototype.save` and `BrowserDaily.prototype.scheduleReminder/listReminders` patched. | Drop (the lost-response case is kept once from `calendar-creation-recovery`). | Low |
| 3 | 69-74 | C3 | Inline IndexedDB transaction hold, third copy of `holdDocumentsTransaction`. | Use the harness helper or drop the case. | None |
| 4 | 7 | A7 | `status` used once (line 44); fine, but `open()`/`begin()` duplicate `calendar-edit-draft` helpers. | Shared `openCalendar`/`startDraft` in harness. | None |
| 5 | 47, 52-53 | B5 | Screenshots to `outputPath` with no consumer. | Drop. | None |
| 6 | 51 | — | Asserts no "Calendar backups" button on Calendar: tied to the deleted backup row (D3). | Drop that assertion. | None |
| 7 | — | T4 | Three engines for renderer form logic. | Chromium only (engine storage contract stays in `assistant-draft-storage`). | Low |

## Proposed end state
`journeys/calendar.spec.ts` draft section: form survives reload without creating an item (event + reminder); Save clears it; New event reopens retained fields with no prompt; Discard needs confirmation and a newer tab's form wins; oversized title shows "Can’t keep edits" until shortened. Delete this file and its `storage-specs.ts` entry.
