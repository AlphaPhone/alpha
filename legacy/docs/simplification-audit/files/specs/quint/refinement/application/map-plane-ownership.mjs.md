# specs/quint/refinement/application/map-plane-ownership.mjs
- Lines: 149 | Kind: Quint ITF trace replay (model-generated traces replayed on a transplanted adapter, `MapPlaneOwnership`, live) | Verdict: PORT
- Covers: Maps draws one plane per mounted element + basemap; retry/release/basemap change/dispose retire it and every plane callback is fenced by generation (`installPrototypeMapsAdapter` in `apps/app/src/prototype/maps-adapter.ts`). Duplicates: none. Callers/importers: `test/quint-map-plane-ownership.test.mjs` only — **not** in the aggregate `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-41 | T2/T10 | Reads `maps-adapter.ts`, injects `globalThis.inspectMapPlane` at `"  let mapCopyright='';"`, concatenates stripped `maps-event-return.ts` + `cloud-provider.ts` (regex-dropping `export *`) + the adapter, regex-drops every `import`, and runs the result in `vm`. | Move plane ownership (generation, plane, element, basemap, copyright) into `apps/app/src/maps/map-plane.ts` as an exported controller; import it with `bundledSource` and port stubs. | M |
| 2 | 51-86 | T2 | The vm context supplies ~30 globals named after the adapter's imports (`MapsScreenController`, `MapPlane`, `bindAgentNavigation`, `cloudMapsBasemap`, …). Any new import used on the render path is `undefined` at run time. The same context shape is copied in `maps-event-return.mjs:65-78` (C5). | Port removes it; until then one shared `maps-adapter-fixture.mjs`. | M |
| 3 | manifest | T10 | Manifest pins `maps/map-plane.ts` and `maps/cloud-maps.ts`, both of which the harness **stubs**; it actually executes `maps-event-return.ts` and `cloud-provider.ts`, which are not pinned. | Pin what runs (falls out of the port). | L: changed-model CI selects the wrong files. |
| 4 | 29 | C3 | Local `tick` duplicates `support.mjs` `tick`. | Import it. | — |
| 5 | test wrapper | B5 | Exact `scenarios.length === 7`, `witnesses.length === 5`, `traces === scenarios+witnesses+60`; prints the receipt with `console.log`. | Drop. | L |
| 6 | 1-15 | — | Good JSDoc header — the convention the `.md` siblings should adopt. | Keep. | — |

## Proposed end state
Replays model traces against an imported plane controller; no adapter text; run by the manifest runner (so it also gets the state/action coverage check the aggregate applies).
