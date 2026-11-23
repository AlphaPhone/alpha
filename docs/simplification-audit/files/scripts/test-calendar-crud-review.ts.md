# scripts/test-calendar-crud-review.ts
- Lines: 97 | Kind: source transplant (`scripts/fixtures/calendar-adapter.ts` slices `prototype/calendar-adapter.ts`, `calendar-days.ts`, `calendar-interval-presentation.ts` and runs them in `vm`) + 2 source-regex asserts | Verdict: DELETE; REWRITE kept cases into `test/browser/journeys/calendar.spec.ts`
- Covers: native event edit/delete is revision-bound, stale/external/unknown outcomes never repeat a delete, an unknown delete holds until an explicit refresh, committed-receipt refresh keeps the unsent form, a commit closes only its own open event, unmount cancels a pending delete. Duplicates: `test/browser/native-calendar-deletion-routing.spec.ts`, `test/calendar-delete-latch.test.mjs`, `CalendarCrudInstrumentedTest` (device). Callers/importers: `test/adapter-contracts.test.mjs` list.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 58-59 | T1 | Regex on `calendar-adapter.ts` import line and on `reminder-creations.ts` re-export text. | Delete. | L |
| 2 | 5, 60-66 | T2 | Adapter is evaluated as transplanted text with injected `mapsEventOriginFor`, `reminderWallTime`, note-origin stubs; every adapter split/rename breaks it. | Delete with the file. | L |
| 3 | 74-96 | T3/D8 | 20 statements per line; asserts on private shell fields (`calendarWriteUncertain`, `calendarSelection()`). | Journey asserts on visible state instead. | L |

## Proposed end state
Journey cases in `journeys/calendar.spec.ts` (chromium, typed `AlphaCalendar` bridge fake with `inspectDeletion`/`removeScoped`): (a) unknown delete outcome shows "unconfirmed", a second delete is blocked until Refresh; (b) external-scope event opens one handoff; (c) committed receipt for another event keeps the open detail and the unsent form; (d) confirmed delete drops the note link. Script and its fixture usage deleted; `scripts/fixtures/calendar-adapter.ts` loses this importer.
