# test/browser/dev-calendar-navigation.spec.ts
- Lines: 35 | Kind: Playwright on the Calendar view with navigation started through `registerPlugin('AlphaCalendar').open` (P2/P7), chromium dev build | Verdict: **MERGE** 2 cases into `journeys/calendar.spec.ts`; **DELETE** the rest
- Covers: opening a specific event (future, all-day, hidden calendar) shows its detail; a missing event cannot report success; a delayed event open is cancelled when the user leaves Calendar; while an open is pending only "Back to apps" is reachable above a cover, then the event lands in view and the header works again. Duplicates: event-open routing from other apps is also driven by `calendar-maps-handoff`, `maps-event-return`, `note-calendar-handoff`. Callers/importers: none. 6 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-14 | P2 / T6 | Tests 1-4 call `AlphaCalendar.open({id})` and assert its return value; the user-facing entry points (Home agenda card, notification, Maps return) are not used. | Delete; the handoff journeys open events through their real entry points. | Low. |
| 2 | 5-7, 15-35 | P3 | Holds every read by replacing `BrowserCalendar.prototype.list`. | Hold the Calendar read in the bridge handler and open the event from a Home agenda card. | Medium: the race needs a hold point the harness can control. |
| 3 | 15-35 | — | The two delayed-open tests guard real renderer behaviour (cover blocks header taps, pending open cancelled by navigating away, header usable after close). | Carry both into `journeys/calendar.spec.ts`. | Medium: only coverage of the cover. |
| 4 | 9, 19, 30 | — | Geometry via `elementFromPoint` is the right check for "a tap reaches it". | Keep as an `expectReachable` helper in `harness/a11y.ts`. | none |
| 5 | 11 | B4 | Double `getItem(...)===null` guard. | — | none |

## Proposed end state
Two cases in `journeys/calendar.spec.ts` ("pending event open blocks the header and lands in view"; "leaving Calendar cancels a pending event open"), entered from a visible agenda card with a bridge-held read. Other cases deleted.
