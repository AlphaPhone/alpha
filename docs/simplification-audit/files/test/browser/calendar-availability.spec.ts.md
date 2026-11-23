# test/browser/calendar-availability.spec.ts
- Lines: 248 | Kind: Playwright, chromium, 9-mode loop + 1 module test (10 runs); real chat → proposal → choose calendars → result → receipt flow over an inline fake Capacitor bridge and a paired "Local development agent" (s3 r28) | Verdict: REWRITE onto the resident-agent harness as part of `journeys/calendar.spec.ts` (production lane); DELETE the module test
- Covers: "Am I free tomorrow?" sends no calendar content, offers the capability only when negotiated, needs an explicit calendar choice, shows busy/free times only, uploads exactly the reviewed result, and records failed receipts for cancel, change-during-review, leaving the app, wrong zone and unsupported capability. Duplicates: none for the availability journey (unique "Share availability" coverage). Callers/importers: chromium only; imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-83 | P6 / D5 | 60-line inline `window.Capacitor` bridge plus pairing through Settings → Connection diagnostics → "Local development agent" (a test-mocks pairing path, D5). The product path on Android is the resident agent. | Use `helpers/resident-agent-plugin.ts` + `flag-off-android.ts` as `calendar-proposal-review.production.spec.ts` does; serve the same `/api/client-devices/*` routes from one shared agent-route fixture. | Medium: largest rewrite in this chunk, but the routes already exist in both files. |
| 2 | 85-94 | P2 | Events seeded via `registerPlugin('AlphaCalendar').save` in page. | In the production lane seed the fake `AlphaCalendar` bridge's `range`/availability answers instead. | Low |
| 3 | 216-248 | T6 | Last test calls `executeCalendarAvailability` with a hand-built provider to check freshness evidence. | Delete; if freshness loss matters, add one journey mode where the bridge omits `freshness` and the result reads "availability is unknown". | Medium: the freshness rule is otherwise uncovered. |
| 4 | 97 | T4 | Nine modes each boot, pair and chat. `cancel-choice`/`cancel-result` and `left-during-review` share the failed-receipt path. | Keep `share`, `all-day`, `free`, `cancel-choice`, `changed-during-review`, `other-zone`, `not-offered`. | Low |
| 5 | 173 | P2 | `Object.defineProperty(document,'hidden')` + `visibilitychange` to simulate leaving. | Harness `backgroundApp()` (same technique, one home). | None |

## Proposed end state
Availability section of `journeys/calendar.spec.ts` in the production project: one `availability(mode)` helper on the resident harness; seven modes asserting the request carries no titles, the choose dialog starts empty, the result shows times only, and the receipt equals the reviewed result (or a failed receipt with the right summary). About 110 lines including the shared agent-route fixture. Delete this file.
