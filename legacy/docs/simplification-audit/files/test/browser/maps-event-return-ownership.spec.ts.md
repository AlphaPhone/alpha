# test/browser/maps-event-return-ownership.spec.ts
- Lines: 93 | Kind: Playwright journey with a held boundary request; project `chromium`, 2 tests | Verdict: **MERGE** into `journeys/maps.spec.ts` (calendar hand-off block)
- Covers: on the canonical (agent) Calendar, "Back to event" from Maps is owned by the latest visit: an older held event read cannot navigate after a newer visit, and `pagehide` retires a held return. Duplicates: none (the other hand-off specs use the browser Calendar provider). Callers/importers: none; imports `app-navigation.ts`, `helpers/canonical-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-36 | T6 (boundary) | Wraps `connectionController.getAppRecordClient().request` via a `/src/runtime/connection-ui.tsx` import to hold `/api/lifeops/calendar/feed` reads whose window is 2 ms. That is a boundary hold, but reached through a product module. | Hold the same request at the harness agent-HTTP fake (`openCanonicalCalendar`'s fixture) instead of patching the client. | Low |
| 2 | 31 | B3 (fragile) | The held read is identified by `max - min === 2` (the event's own instant). | Name it in the fixture (`holdEventRead()`), so the coupling lives in one helper. | Low |
| 3 | 79, 87 | T6 | Synthetic `PageTransitionEvent`s; there is no real way to page-hide a visible page in Playwright. | Keep, commented as the only lifecycle simulation. | none |

## Proposed end state
Two tests in the hand-off block of `journeys/maps.spec.ts`, sharing the canonical Calendar fixture with
`maps-event-return` once that spec is re-based on the canonical Calendar. The held read is a fixture method, not a
patched client.
