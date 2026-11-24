# test/calendar-day-context.test.mjs
- Lines: 195 | Kind: integration (seven real runtime modules loaded through the Vite-aware `test/fixtures/browser-source.mjs`: `alpha-client`, `phone-context`, `calendar-day-observation`, `client-observation-support`, `local-agent`, `device-actions`, `view-navigation`, plus `agent-calendar`; synthetic transports) | Verdict: KEEP, MERGE into `test/integration/calendar.test.ts` (trimmed)
- Covers: the visible Calendar day is sent to the agent only from the ordinary ready owner Calendar, only to a peer that declared support for the exact session/API-process, exactly once on the wire, never in journals or navigation metadata, and a date change re-revisions context. Duplicates: none found for the wire/journal parts. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23 | A1 | Patch table includes `status:'legacy-recovery'` and `calendarAuthority:'android-native'/'browser-local'`; the legacy calendar authority goes with D1/A1 (C2). | Drop those rows when the product guard loses them. | None |
| 2 | 14-24 | T3 | 25-row predicate table for `calendarDayObservation`. | Keep 4-5 representative rows (locked, hidden, form open, not ready, bad zone). | Low |
| 3 | 55-71 | T3 | Exhaustive support-cache key table incl. UUID versions 1-8 loop. | Keep "any binding field change drops support" and "malformed declaration refused"; drop the UUID-version loop. | Low |
| 4 | 102-121 | - | Journal projection strips `calendarDay` and a new day invalidates a reviewed proposal: real cross-module property. | Keep. | None |
| 5 | 141-156 | - | Actual `LocalAgentProtocol` serializes the day once: real wire check. | Keep. | None |
| 6 | 158-180 | - | Calendar re-read during a pending turn keeps the turn: real `AgentCalendar` + `AlphaClient`. | Keep. | None |
| 7 | 182-195 | T3 | Timeline 24-hour labels from `calendar-interval-presentation.ts`: unrelated UI formatting. | Move to `journeys/calendar.spec.ts` (en-GB locale, early event shows `05`). | Low |
| 8 | 124 | B4 | Saves/restores `globalThis.document` by hand. | Use the integration harness's DOM-less shim once. | None |

## Proposed end state
About 100 lines in `test/integration/calendar.test.ts` (section "visible day context"): surface predicate (short
table), support binding, journal/navigation never carry the day, wire carries it once, pending turn survives re-read.
Legacy-authority rows removed with C2; the hour-label case moves to the Calendar journey.
