# specs/quint/refinement/application/browser-reminder-orphan.mjs
- Lines: 346 | Kind: Quint refinement harness (real `BrowserDaily`/`BrowserClock`/reminder store via `test/fixtures/browser-daily-stores.mjs`; `deletion-recovery.ts` via `sourceModule`) | Verdict: DELETE (carry two current-behaviour schedules)
- Covers: how current Reminder/Clock code treats a legacy orphan `pendingDeletion` marker (no own deletion record), including a legacy `localStorage` import, against `BrowserReminderOrphan.qnt`. Duplicates: run by `test/quint-browser-reminder-orphan-refinement.test.mjs` and aggregate `index.mjs:78`. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-49, 60-61, 113-115, 279-283, 310-313 | A1 | Seeds the exact legacy orphan shape and the legacy envelope `{version:1, legacy:null, value}` / plain `localStorage` import, and asserts `captured.legacy`/`legacyChanged` — the legacy readers D1 deletes (`domain-document.ts`, `reminder-store.ts:6`, B171). Six of eight schedules exist only for the orphan. | Delete harness, `.md`, `BrowserReminderOrphan.qnt`, manifest entry, `index.mjs:78`, the per-model test. | L |
| 2 | 303-309, 314-320 | — | Two schedules test **current** behaviour: "genuine-pair-guards-edits-decisions-and-replacement-until-undo" (a queued deletion blocks edit, Done, same-ID schedule, Clock cancel/dismiss with "Undo or finish", Undo releases) and "clock-lock-rechecks-a-new-pair-and-undo-restores-normal-ringing" (Clock re-reads after the ringing lock; a staged deletion suppresses sound; Undo restores it). | Carry both as cases in `test/browser-clock.test.mjs` (already imports `browser-daily-stores.mjs` and `browser-reminder-clock.mjs`) or in the reminders journey `journeys/reminders.spec.ts`. `reminder-delete-review.spec.ts` asserts "Undo or finish" only once. | M |
| 3 | 264-332 | C4 | Same globals save/restore block as `browser-journal-retention.mjs`. | Goes. | — |

## Proposed end state
Deleted. `test/fixtures/browser-reminder-clock.mjs` survives (still imported by `test/browser-clock.test.mjs`); `test/fixtures/browser-daily-stores.mjs` survives (journal-retention, deletion-poll, host tests).
