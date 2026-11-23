# test/quint-map-plane-ownership.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (`replayMapPlaneOwnership`, `specs/quint/refinement/application/map-plane-ownership.mjs`; driver strips/slices `prototype/maps-adapter.ts` into `vm`) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the Maps adapter map-plane handling (render, basemap, plane events, retry, release, dispose) follows MapPlaneOwnership (7 scenarios, 5 witnesses, 60 walks). Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | 8-9,12-14 | B5 | Pins scenario count 7, witness count 5, `traces = 7+5+60`, checkpoint floor. | Drop. | None |
| 3 | 11 | Hygiene | `console.log(JSON.stringify(result))` noise in test output. | Drop. | None |
| 4 | — | T10 | Driver slices `maps-adapter.ts`. | PORT: export the map-plane owner from the Maps adapter split. | Medium |

## Proposed end state
Deleted; MapPlaneOwnership is registered in the application index and imports an exported map-plane module.
