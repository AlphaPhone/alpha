# test/browser/canonical-calendar-form-review.spec.ts
- Lines: 31 | Kind: Playwright, `chromium` project (the helper switches to the flag-off bridge when run in `production`), UI journey with React-fiber state reads (T6) | Verdict: **MERGE** into `journeys/calendar.spec.ts`
- Covers: the agent-backed (canonical) Calendar event detail and editor show both UTC offsets across a DST change, the guests, the right local start/end; a backward-clock (repeated hour) event hides time fields but allows title edits; cancelling or retiring a delete review sends no mutation. Duplicates: none found for the DST cases (`UTC-05:00` appears only here). Callers/importers: none. Helpers: `helpers/canonical-calendar.ts` (`openCanonicalCalendar`), `helpers/browser-calendar.ts` (`chooseCalendarEventAction`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T6, P3 | `state()` walks `__reactFiber$` from `[data-screen]` to the shell component and calls `vget`/`vset('calendar')`. Used to read the form duration (`form.d`) and title and to force `open:null`. | Delete the helper. Assert duration through visible fields (End time value, any duration label) and the title through the textbox value; replace the forced `open:null` retire with a real retire trigger (Back, or the fixture announcing a newer revision). | Medium: the "retire review" case (line 29) has no visible trigger today; if none exists, drop that half and keep Cancel. |
| 2 | 15, 30 | none | `canonicalCalendarAccessibility.requests` method checks prove no write was sent. Good boundary assertion (fixture transport). | Keep; expose through the harness recorder (`window.__alphaTest.calls`). | none |
| 3 | 1-31 | D8 | Minified style, several statements per line. | Reformat on move. | none |
| 4 | 7,18,25 | T8 | `page.clock.setFixedTime` per test: fine (no timers raced). | Keep through harness `time` option. | none |

## Proposed end state
Three steps in `journeys/calendar.spec.ts` (events section): DST-spanning event detail and editor (both offsets, guest,
local times, edit end time shows new duration); repeated-hour event keeps original timing and allows title edit;
delete review Cancel sends no write. No fiber access, no `vset`. Delete this file.
