# specs/quint/refinement/application/browser-deletion-poll.mjs
- Lines: 136 | Kind: Quint refinement harness (real bundled browser Calendar/Reminder stores via `test/fixtures/browser-daily-stores.mjs`, controlled document edit port) | Verdict: KEEP, SIMPLIFY (move off `legacy/`)
- Covers: queued agent-deletion settlement for browser Calendar and Reminders — expiry by monotonic deadline, two overlapping pollers, stale reader after a successful competitor, failed editor leaving the row — against `BrowserDeletionPoll.qnt` (47 lines, live). Duplicates: reminder/calendar deletion host tests in `test/` (bucketed elsewhere). Callers/importers: `index.mjs`, `test/quint-browser-deletion-poll.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 12 | P6 | Imports `deferred` from `specs/quint/legacy/core/source-support.mjs` (historical tree) and lists it as a source. This is one of the three live harnesses blocking deletion of `specs/quint/legacy` (research §2.10). | Import `deferred` from `./support.mjs` (it already exports one). | None |
| 2 | 8-12 | D4 dependency | Sources include `apps/app/src/browser/calendar.ts`/`calendar-store.ts`; `calendar-store.ts` is modified and `calendar-linked-local.ts`/`calendar-sync-fields.ts` deleted in this worktree (D4). `BrowserCalendar.executeAgent`/`settleDeletions` still exist, so the harness should still pass; re-run after stage A. | Re-run; no change expected. | Low |
| 3 | 40-41, 92-95 | (ok) | Overrides `performance.now` for a controlled clock and restores it. This is the clean alternative to text-patching `Date.now()` (see `agent-calendar-refresh.mjs`). | Keep. | – |
| 4 | 99-102, 120-125 | B4-ish | Saves/restores ten globals around `installBrowserDailyFixtures()` because the fixture mutates `globalThis`. | Move the save/restore into the fixture (return a disposer). | Low |
| 5 | 99, 126 | B5 | `captureInputs`. | Drop. | None |
| 6 | 132-135 | – | Returns a free-text obligation. | Move into model comment. | None |

## Proposed end state
~115 lines, `deferred` from local support, fixture owns its global install/uninstall, no hashing. Six traces
(3 schedules x calendar/reminder) unchanged.
