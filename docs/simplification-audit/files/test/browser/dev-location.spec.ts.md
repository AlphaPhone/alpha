# test/browser/dev-location.spec.ts
- Lines: 116 (20 call sites, about 27 tests after loops) | Kind: Playwright `chromium`, dev build; 33 `/src` imports, fake `navigator.geolocation`/`permissions` in nearly every test, 2 UI journeys | Verdict: **MERGE** into `journeys/maps.spec.ts` (1 case) and `journeys/workflows.spec.ts` (1 case); delete the rest
- Covers: the development location simulator (configured coordinates, saved Home, radius, accuracy), a workflow "I'm not at home" condition, the Location dialog in Device controls, live coordinate listeners, background blocking a watch, normal profile ignoring developer coordinates, Maps Recenter placing the position marker, and about 16 unit tests of `BrowserLocation` permission-request ownership and cancellation. Duplicates: `location-settings-recovery.spec.ts` (location setting validation and recovery). Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P2 | `configure()` saves a Home through `SavedPlaces` and the simulator through `saveLocationSimulation` in-page. | Seed with `context.setGeolocation` and a saved place created in Maps. | Low |
| 2 | 6-7 | — | Workflow away-from-home condition: skip at Home, run when 0.01° away, fail when accuracy overlaps the boundary. | Carry the skip/ok pair as one workflow case; drop the accuracy arm. Assert the run result in the Workflows view, not `localRuns` JSON. | Low |
| 3 | 8 | P7 | Developer Location dialog validates latitude and persists `alpha.dev.location.v1`. | Delete (developer surface). | Low |
| 4 | 9-12, 17-18, 20-116 | T6, P3 | Listener streams, background block, profile isolation and all `BrowserLocation` permission tests: hand-built `navigator.geolocation` and `permissions`, direct module calls, no user action. | Delete. | Medium: permission-request ownership across cancel, storage events, other tabs and timed-out fixes (browser stand-in for `ElizaLocation`) loses coverage. |
| 5 | 13-16 | — | Maps Recenter shows "Your position" exactly where a pin dropped at the same coordinates points (MapLibre 14 px tip offset), tiles routed locally. | Carry into the maps journey with `setGeolocation`. | none |
| 6 | 13, 68-69 | A8 | Comments cite an upstream commit (`plugin-maps 31a7fc4ca1`) and narrate startup history. | Drop. | none |
| 7 | 9 | T8 | `setTimeout(r,1100)` inside `page.evaluate` to prove no further event. | Gone. | none |

## Proposed end state
`journeys/maps.spec.ts` gains "Recenter shows my position"; `journeys/workflows.spec.ts` gains "location condition skips at Home and runs away from Home". The rest is deleted. If the owner keeps the browser location simulator (Q-DEV-1), its Location dialog becomes one step of `journeys/dev-surface.spec.ts`.
