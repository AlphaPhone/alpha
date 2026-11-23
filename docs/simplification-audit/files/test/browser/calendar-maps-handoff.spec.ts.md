# test/browser/calendar-maps-handoff.spec.ts
- Lines: 42 | Kind: Playwright, chromium (dev), 4 tests; real UI after module seeding of store + Maps provider (s3 r26) | Verdict: MERGE into `journeys/maps.spec.ts`
- Covers: tapping an event's address opens Maps searching it once; result choice and directions are kept; system Back unwinds route → place → search → the same event; signed-out Maps keeps the address without inventing a destination; a late address response cannot replace a newer search; leaving during the search prevents late results. Duplicates: none for the Calendar→Maps handoff ("Search places" appears in ~12 Maps specs for other entries). Callers/importers: chromium only; imports `helpers/browser-calendar.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | A1 | Seeds the event by writing the legacy envelope `{version:1,legacy:localStorage.getItem('alpha.browser.calendar.v1'),value:raw}` through `browserDocuments.edit`. Breaks when the envelope and legacy reader go (D1). | Seed through the harness Calendar seeder (bridge `AlphaCalendar.save`). | High if not changed with D1: the spec fails. |
| 2 | 12 | P2 | `configureMapsProvider(...)` from an in-page import with a 600-character provider literal. | Harness `maps.configure({places,route})` shared with the other Maps specs. | Low |
| 3 | 13 | P2 | Opens the event via `registerPlugin('AlphaCalendar').open({id})`. | Tap the event in the Calendar list. | None |
| 4 | 18 | P2 | System Back via `alpha-back` event. | Harness `systemBack()`. | None |
| 5 | 24 | B5 | Screenshot with no consumer. | Drop. | None |

## Proposed end state
Calendar handoff section of `journeys/maps.spec.ts`: event address → one search → choose place → Directions → Back ×3 returns to the same event; signed-out case; late-response race (one case covering both "newer search" and "left during search"). Seeding through harness fixtures only. Delete this file.
