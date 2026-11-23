# test/browser/maps-event-return.spec.ts
- Lines: 211 | Kind: Playwright journey on the dev browser Calendar provider with backdoors; project `chromium`, 5 tests, 120 s timeout | Verdict: **MERGE** into `journeys/maps.spec.ts` (calendar hand-off block), re-based on the canonical Calendar
- Covers: "Back to event" returns to exactly the originating event from every Maps layer, once; launcher-opened Maps has no return; moved/deleted events fail closed; double activation returns once; reload/Home drop the return; refused/failed reads keep the control; system Back unwinds a chosen place first; travel-mode `aria-pressed`. Duplicates: `calendar-maps-handoff.spec.ts` (4 tests: address searches once, preserves result choice, returns to same event): **T4**, fold together. Callers/importers: none; imports `helpers/browser-calendar.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-28, 146 | T6 | `configureMapsProvider` from `/src/maps/runtime.ts` with a request log in `localStorage`; re-installed after reload. | Shared Maps-provider fixture at the Cloud HTTP boundary with an in-test request log. | Low |
| 2 | 113-119, 129 | T6 | "Another window changes the event" is simulated by `calendarDocument.edit` from `/src/browser/calendar-store.ts`. | Use a second page in the same context (a real other window), or the canonical Calendar fixture's server-side edit. | Medium |
| 3 | 165-168, 179 | T6 | Patches `BrowserCalendar.prototype.list` to refuse or throw. | Refuse at the fixture boundary (canonical feed returns 403/500). | Low |
| 4 | 42, 44 | D5 | Runs on `?mode=dev&tools=1` with the browser (dev) Calendar provider; the product Calendar is the agent-side one (`maps-event-return-ownership.spec.ts` already uses it). | Re-base on `openCanonicalCalendar` so both hand-off specs share one fixture. | Medium: dev-provider-only behaviour (e.g. recurring refusal text) must be rechecked |
| 5 | 31-38 | — | `systemBack` goes through the dev "Device controls" dialog. | Use `alpha-back` dispatch or the harness `pressBack` helper shared with other journeys. | none |
| 6 | 10 | T8 | File-wide 120 s timeout. | Default timeout once backdoors are gone. | none |

## Proposed end state
About four tests in the hand-off block of `journeys/maps.spec.ts`, combining this spec, `calendar-maps-handoff.spec.ts` and
`maps-event-return-ownership.spec.ts`: exact return and layers (with travel-mode state), fail-closed on moved/deleted,
once-only/reload/Home, refused read keeps control, and system Back unwinding. One canonical Calendar fixture, one
Maps provider fixture, no `/src` imports.
