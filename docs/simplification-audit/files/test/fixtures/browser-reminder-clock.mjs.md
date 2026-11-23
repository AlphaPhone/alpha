# test/fixtures/browser-reminder-clock.mjs
- Lines: 60 | Kind: integration helper (real BrowserClock with held Web Lock and synthetic audio) | Verdict: KEEP (fold into the browser-daily harness)
- Covers: alarm ringing owner lock `alpha.browser.alarm-owner` (ifAvailable), suspended alarm releases lock without sound, ring plays `alarm`. Duplicates: none. Callers/importers: `test/browser-clock.test.mjs`, live Quint `specs/quint/refinement/application/browser-reminder-orphan.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18 | T8 | Replaces `globalThis.setInterval` with a no-op for the duration; restore is in `finally` (good) but any other timer user in the same process is affected. | Inject the poll scheduler into BrowserClock. | Low |
| 2 | 44-48 | T8 | `waitForSound` spins up to 1000 setImmediate / 5 s; `grantWithoutSound` uses a 2 s timeout race. | One `waitFor` helper. | Low |

## Proposed end state
Merged into the browser-daily integration support module as `withObservedClock`; used by the calendar-reminders integration test and the reminder-orphan Quint harness.
