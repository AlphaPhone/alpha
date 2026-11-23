# test/browser/upstream-map-plane.spec.ts
- Lines: 69 | Kind: Playwright chromium, 8 tests (1 + 3-mode loop + 4-mode loop); test 1 module-in-page `MapPlane`; the loops drive the real Maps UI with Playwright geolocation; the configured group starts a second Vite server with `define` overrides (s2 r26) | Verdict: MERGE into `journeys/maps.spec.ts`
- Covers: the shared map renderer loads its worker and draws a host-styled route; without a configured provider, location works (granted, denied → Location settings, late fix) and coordinates entry drops a pin; with a configured synthetic provider, the renderer recovers from WebGL loss and tile errors via Retry map, shows outside-coverage state, and the credits/privacy text names the provider. Duplicates: other `maps-*` specs and `quint-map-plane-ownership.test.mjs` (host Quint replay of plane ownership). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-36 | T6 | Constructs `MapPlane` in a hand-made container and reads `map.getPaintProperty('route-line','line-color')`. The configured-renderer `granted` case already proves a canvas and marker render in the real view. | Delete; if route colour matters, assert it after a real route in the configured case. | Low |
| 2 | 43 | P2 | `mapsConnection().config.status` read via `/src/maps/runtime.ts`. | Assert the visible unconfigured state (no Directions button, already asserted). | None |
| 3 | 55 | P1 | Second Vite server (`createServer`, temp cache dir) for the configured group: a cold transform per worker on top of the shared dev server. | Keep only if a runtime switch for the Maps base URL is impossible; otherwise expose the configured provider through the test-mocks build flag on the shared server. | Low |
| 4 | 42, 60 | P3 | Overrides `navigator.geolocation.watchPosition` and `HTMLCanvasElement.prototype.getContext` in init scripts. Boundary-level and acceptable; move to harness helpers. | `harness/geo.ts`, `harness/webgl.ts`. | None |
| 5 | 57 | T4 | `granted` in both groups re-tests the same happy path. | Keep unconfigured `granted` only as part of the coordinates-entry case. | None |

## Proposed end state
`journeys/maps.spec.ts`: unconfigured Maps — location granted/denied/late fix and coordinate pin, credits name OpenFreeMap; configured provider — renderer ready with marker, WebGL loss and tile failure recover through Retry map, outside-coverage notice, privacy text names the provider. Drop the in-page `MapPlane` case and the module status read. Delete this file.
