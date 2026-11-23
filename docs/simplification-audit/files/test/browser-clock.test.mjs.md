# test/browser-clock.test.mjs
- Lines: 65 | Kind: integration (real `BrowserDaily`/`BrowserClock`/`reminder-store` via `test/fixtures/browser-daily-stores.mjs` on jsdom; case 3 also uses `test/fixtures/browser-reminder-clock.mjs`) | Verdict: MERGE into `test/integration/browser-daily.test.mjs`
- Covers: an alarm saved with notifications off says "Saved · muted", is listed and can be deleted; it is scheduled once notifications are turned on, with no extra writes while they stay off; a pending alarm stays visible but a deletion staged after the poll stops it ringing, and undo lets it ring. Duplicates: `test/browser/dev-clock.spec.ts` (12 tests, set/list/reload/delete through rendered controls, ring/snooze/dismiss, DND), `agent-clock-handoff.spec.ts`; case 3 mirrors the Quint harness `specs/quint/refinement/application/browser-reminder-orphan.mjs` (same fixture). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-30 | T4 | Save, list and delete through the dialog duplicates `dev-clock.spec.ts` case 1; only the "Saved · muted" status with notifications off is new. | Move that assertion into `journeys/clock.spec.ts` (or the dev-clock journey) with notifications denied; drop the rest. | Low |
| 2 | 32-41 | — | Reschedule-on-permission-grant with a write counter: a deterministic integration check a page journey cannot count. | Carry. | — |
| 3 | 43-65 | T4 | Uses the same `withObservedReminderClock` driver as the Quint refinement harness `browser-reminder-orphan.mjs`. If that harness replays the same lock-recheck trace, this case is a duplicate. | Keep only if the Quint harness does not cover "pending deletion staged after poll"; otherwise delete. | Low |
| 4 | 5, 14, 24, 27 | T8 | `until()` polls every 10 ms for up to 2 s and calls `refresh()` inside the predicate (side effect in a wait condition). | Await the store's change event instead when merging. | Low |
| 5 | 10 | — | Replaces `globalThis.setInterval` while constructing `BrowserClock` so the process can exit. That is a test hook on a global. | Give `BrowserClock` a disposer, or pass the interval in, when this moves. | Low |
| 6 | fixtures | — | `browser-reminder-clock.mjs` importers: this file and `browser-reminder-orphan.mjs` (Quint). It survives. | — | — |

## Proposed end state
Case 2 (and case 3 if not duplicated by Quint) in `test/integration/browser-daily.test.mjs`; the muted-save status in the clock journey.
