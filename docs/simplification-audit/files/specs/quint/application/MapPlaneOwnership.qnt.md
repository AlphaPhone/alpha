# specs/quint/application/MapPlaneOwnership.qnt
- Lines: 137 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (adapter transplant)
- Covers: Maps draws one plane per mounted element+basemap; retry/leave/basemap change retire it and every plane callback is fenced by generation (`prototype/maps-adapter.ts`, `maps/map-plane.ts`, `maps/cloud-maps.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `map-plane-ownership.mjs` via `test/quint-map-plane-ownership.test.mjs` (not in the aggregate; uses `services/maps-model-traces.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 32-51 | T2 | Reads maps-adapter.ts, strips it and runs `installPrototypeMapsAdapter` in a vm (imports only `createMapsNotificationOpen` for real). | Move plane ownership (generation, dropPlane, planeElement/basemap) into `maps/map-plane.ts` as an exported controller and import it. | M |
| 2 | manifest symbols | T10 | Pins adapter locals `mapGeneration`, `dropPlane`, `planeElement`, `planeBasemap`. | Pin files. | L |
| 3 | test 9-12 | B5 | Test asserts exact counts (`witnesses.length === 5`, `traces === scenarios + witnesses + 60`). | Drop exact-count asserts; rely on harness failure. | L |

## Proposed end state
- Model unchanged.
- Harness imports an exported plane controller; no adapter slicing; no exact-count asserts.
