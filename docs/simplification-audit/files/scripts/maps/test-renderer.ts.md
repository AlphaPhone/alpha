# scripts/maps/test-renderer.ts
- Lines: 134 | Kind: browser end-to-end script (raw Playwright against a manually started `dev:maps` app + real regional gateway; uses `?mode=dev` coordinate location source via `localStorage` + `alpha:dev-location` event) | Verdict: REWRITE as `test/browser/journeys/maps.spec.ts` (chromium, test-mocks) with a fixture regional provider, then DELETE
- Covers: vector tiles render; one pin per search result; tapping a pin selects the place and clears pins; route waits for the selected place detail; Walk/Bike/Drive modes; out-of-region error clears the old route; a stale origin search is cancelled by editing; a named origin replans; turn-by-turn shows the next maneuver, its icon, the "Then" step, position marker; off-route and arrival status; place detail shows opening hours, phone, website. Duplicates: guidance midway along a segment in `test/browser/dev-maps-voice.spec.ts:23`; renderer/worker draw in `upstream-map-plane.spec.ts:10`; `test/maps-navigation.test.mjs` unit-tests `guidanceView`/`atStep`. Callers/importers: **none execute it** (only a false-positive substring hit in `test/dev-surface-gates.test.mjs:19`, `policy-test-renderer`); imports `scripts/fixtures/playwright.ts` and upstream `plugin-maps` contract types.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T9 | Orphan journey script with the broadest Maps journey coverage in the repo, but never run, so its coverage is zero today. | Port to a real Playwright journey and delete. | None today. |
| 2 | 100 | T6 | Moves the device by writing `alpha.dev.location.v1` to `localStorage` and dispatching `alpha:dev-location` (backdoor state seeding). | Use the harness's typed geolocation fixture (or the dev location panel through the UI) in the journey. | Low. |
| 3 | 10, 109-110 | T1 | Asserts SVG path `d` strings of icons copied into the test. | Assert the maneuver via accessible name/`data-maneuver` attribute instead. | Low. |
| 4 | 78 | T8 | `page.waitForTimeout(500)` to prove a cancelled search never shows. | Wait for the next state (route summary) then assert absence. | Low. |
| 5 | 132 | B5 | Writes screenshots and `renderer.json` evidence nobody reads. | Drop. | None. |

Cases worth carrying into `journeys/maps.spec.ts`: result pins = results and pin tap selects; route waits for place
detail; mode switch replans; out-of-region error clears old route; stale origin search cancelled; named origin replans;
guidance next/then/position marker, off-route, arrival, End navigation clears marker; place detail tags shown. Skip the
tile-request count (covered by `upstream-map-plane.spec.ts`).

## Proposed end state
Deleted. One maps journey spec on the shared harness with a canned regional-provider fixture (no GraphHopper, no
real dataset), plus the recovery cases from `test-recovery-renderer.ts`. Once it exists, the `guidanceView`/`atStep` unit
tests in `test/maps-navigation.test.mjs` become duplicates (T4) and can go.
