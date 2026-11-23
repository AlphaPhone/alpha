# test/maps-route-distance.test.mjs
- Lines: 16 | Kind: unit of an upstream function (`distanceToRoute`, re-exported by `apps/app/src/maps/route-distance.ts` from prepared `plugin-maps`) | Verdict: DELETE
- Covers: point-to-polyline distance incl. date line. Duplicates: upstream `plugin-maps` tests; exercised by `scripts/test-maps-reroute-freshness.ts` and the navigation-progress refinement. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-16 | T5 / T3 | Tests upstream geometry through a re-export. | Delete. If the re-export file is only a pass-through, D4 says import upstream directly. | None |

## Proposed end state
File deleted.
