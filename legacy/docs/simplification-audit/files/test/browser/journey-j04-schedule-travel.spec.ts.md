# test/browser/journey-j04-schedule-travel.spec.ts
- Lines: 192 | Kind: Playwright journey, `chromium` (`/?mode=dev&tools=1`), 1 test; Maps provider installed with `import('/src/maps/runtime.ts').configureMapsProvider` after every load (T6 setup) | Verdict: MERGE into `journeys/maps.spec.ts`
- Covers: browser-calendar event location handed to Maps once, explicit destination/origin/mode, refused Bike/Transit, Start without location permission, Back to event and system Back without a second hand-off, reload does not replay. Duplicates: `journey-j04-cloud-maps.production.spec.ts` test 1 (same hand-off, origin, mode, Back to event on the production bundle). Callers/importers: none; imports `openBrowserCalendar`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-51 | T6 | Provider configured by importing `/src/maps/runtime.ts` in-page and re-installed after each reload. | Not needed once the cases run on the production project with the Cloud Maps stub. | Low. |
| 2 | 63-133 | T4 | Steps 1-3 duplicate cloud-maps test 1 (hand-off once, two candidates, origin, Transit refused, Walk). | Drop. | Low. |
| 3 | 118-119 | - | "Bike directions are not available from this Maps provider" refusal is only here. | Carry as one step in the maps journey (Cloud stub with no bike mode). | Low. |
| 4 | 149-168 | - | System Back (dev "Device controls → Back") returns to the same event without another hand-off; only here. | Carry, using the harness's Back (`alpha-back` event) on the production bundle. | Low. |
| 5 | 170-191 | - | Reload does not replay the hand-off; Maps from the launcher has no Back to event. Only here. | Carry. | Low. |
| 6 | 130-131 | - | "Location permission was not granted" on Start is the browser-build state; production covers Start with a granted fix. | Drop (dev-only state). | Low. |

## Proposed end state
File deleted. `journeys/maps.spec.ts` gains three steps: Bike refused by name, system Back returns to the event without a new search, reload/launcher open does not replay the hand-off.
