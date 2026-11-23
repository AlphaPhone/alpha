# test/map-theme-colors.test.mjs
- Lines: 75 | Kind: transplant (slices `resolveMapColors` out of `apps/app/src/maps/map-plane.ts`, strips types, imports via data URL) + source-text (71-75) | Verdict: DELETE
- Covers: Map theme tokens resolve to MapLibre-compatible colors from the connected host; unresolved/cyclic/invalid tokens refuse construction. Duplicates: `test/browser/map-label-contrast.spec.ts`, `test/browser/upstream-map-plane.spec.ts`, Quint `specs/quint/refinement/application/map-plane-ownership.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T2 / D7 | Text slice between `export function resolveMapColors(` and the `/** Product palette` comment; asserts the export appears exactly once. Breaks on any reorder or comment edit. | Delete. | Low |
| 2 | 16-38 | T3 | Hand-built CSSOM fake for a function that runs in real Chromium in the map specs. | Delete. | Low |
| 3 | 71-75 | T1 | Regex for `region.kind==='global'?colors:resolveMapColors(...)` and absence of `mapReady`. | Delete. | None |
| 4 | 57-70 | - | Failure modes (missing token → construction refused) are not covered elsewhere. | If wanted, one case in `journeys/maps.spec.ts` theme switch (light/dark) asserting the map renders; failure modes are not user-reachable. | Low |

## Proposed end state
File deleted. Map theming is covered by the maps journey (light and dark) and the map-plane refinement.
