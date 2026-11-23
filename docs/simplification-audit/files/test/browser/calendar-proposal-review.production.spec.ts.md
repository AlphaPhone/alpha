# test/browser/calendar-proposal-review.production.spec.ts
- Lines: 239 | Kind: Playwright, production project (flag-off bundle + resident-agent stub), 3 tests; real UI journey (s0 r15, 1 sleep) | Verdict: KEEP (move into `journeys/calendar.spec.ts` production section on the shared bridge harness)
- Covers: an agent `calendar_create_local` proposal is shown as a conversation card with title, zone-correct time, calendar and attendee statement; nothing reaches the native Calendar plugin or journal before Approve; Approve (double-click) hands exactly the reviewed operation over once with its journal identity; reload does not replay; Decline hands nothing over; an un-negotiated capability is never offered. Duplicates: none for the Android renderer card (the browser stand-in review is in `dev-calendar-assistant.spec.ts`). Callers/importers: production project; imports `flag-off-android.ts` (`seedCompletedAccessSetup`, `completeAccessSetup`), `helpers/resident-agent-plugin.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-148 | P6 | 115-line inline `window.Capacitor` bridge (8 plugins) and agent route table; near-identical tables in `chat-decline.production.spec.ts`, `mail-review.production.spec.ts`, `calendar-availability.spec.ts`. | `installBridge(page,handlers)` + shared `agentRoutes({proposals,capabilities})` fixture; this spec supplies only the AlphaCalendar recorder. | Low |
| 2 | 40, 137-139 | C6 / A3 | Seeds `'cloud:production'` credential and Cloud billing routes it does not assert on. | Move to the resident harness default. | None |
| 3 | 1-2 | — | Two import lines from the same module. | One import. | None |
| 4 | 239 | — | `test.beforeEach` declared at the bottom of the file. | Move to top / harness. | None |
| 5 | 230 | T8 | `waitForTimeout(1500)` to prove absence. | Poll `lists>1` (a second proposal read happened) then assert absence. | None |
| 6 | 6-18 | A8 | Long "evidence boundary" banner. | Two-line comment. | None |

## Proposed end state
The production section of `journeys/calendar.spec.ts` holds these three cases (≈60 lines) on the shared bridge/agent fixture, alongside the availability cases rewritten from `calendar-availability.spec.ts`. Behaviour and assertions unchanged.
