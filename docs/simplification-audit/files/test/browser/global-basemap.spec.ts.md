# test/browser/global-basemap.spec.ts
- Lines: 39 | Kind: Playwright, chromium, mobile/touch emulation. Real MapLibre, worker and GL against a closed style and GeoJSON served by `page.route`; geolocation is replaced to forbid physical location. One `/src` read (`mapsConnection().config.status`) and one in-page `configureMapsProvider` seed (P2) (s2/r23) | Verdict: **MERGE into `journeys/maps.spec.ts`**
- Covers: the world map renders with credits (OpenFreeMap, OpenMapTiles, OpenStreetMap) and never reads location. A manual coordinate search drops a pin at zoom 14 that clears the header, credits and place sheet in portrait and landscape, including after rotation. Directions are absent without a route provider, and unmounting removes the canvas. A style failure shows "Map rendering is unavailable…" with Retry while coordinates still work. A configured route provider composes with a manual pin with no fit warnings. Duplicates: `upstream-map-plane.spec.ts`, `root-view-states.spec.ts`, and the production `managed-maps-unavailable.production.spec.ts` / `google-maps-raster.production.spec.ts` (different providers). Callers: the chromium project. Helper: `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 9-11 | C6 | The closed OpenFreeMap style is defined here, and a simpler copy lives in `flag-off-android.ts:411`. | One `harness/maps.ts` `closedBasemap(page,{fail})`. | none |
| 2 | 28 | T6 | `mapsConnection().config.status === 'unconfigured'` is read from `/src/maps/runtime.ts`. | Drop it. The visible absence of Directions already proves it. | none |
| 3 | 37 | P2 | The route provider is injected with `configureMapsProvider` in the page. | Configure it through the harness connection/Cloud fake that the product reads providers from. If no such boundary exists, keep this single seed and mark it. | Low |
| 4 | 13 | — | `/?connections=advanced` is a run-mode flag (D5 flag zoo). | Use the harness default connection. | Low |
| 5 | 27-28 | D8 | Two 600-character lines. | Formatter pass on merge. | none |
| 6 | 28 | B5 | A screenshot with no assertion. | Drop it. | none |

## Proposed end state
A "global basemap" block in `journeys/maps.spec.ts`: a three-viewport render, credits and manual pin; failure stays
honest; a manual pin with a configured route provider. It uses the shared closed basemap and has no `/src` reads.
