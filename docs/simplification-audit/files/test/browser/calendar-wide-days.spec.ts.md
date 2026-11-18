# test/browser/calendar-wide-days.spec.ts
- Lines: 40 | Kind: Playwright, chromium (dev, mobile 1280×800 touch), 1 test; real UI after plugin seeding (s2 r12, clock) | Verdict: MERGE into `journeys/calendar.spec.ts` (layout section)
- Covers: wide layout shows five day columns led by the previous day, an overnight segment opens the original event and keeps the same days, and 150 % text switches to an agenda listing all of the day's events with times. Duplicates: agenda also in `dev-calendar-all-day-save.spec.ts`, `responsive-surfaces.production.spec.ts`. Callers/importers: chromium only; imports `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | P2 | Seeds via `registerPlugin('AlphaCalendar').save/acknowledgeCreation`. | Harness `seedCalendar`. | None |
| 2 | 30 | P2 | Text scale via `BrowserDevice.prototype.setTextScale`. | Harness `setTextScale`. | None |
| 3 | 9 | — | Seeds `{kind:'offline',localApps:true}`; `localApps` is the only use in this chunk. | Harness option. | None |
| 4 | 23, 37 | B5 | Screenshots with no consumer. | Drop. | None |
| 5 | 3 | A8 | "Issue #411" reference. | Drop. | None |

## Proposed end state
One case in `journeys/calendar.spec.ts` (wide viewport describe) with the same assertions, seeded through the harness. Delete this file.
