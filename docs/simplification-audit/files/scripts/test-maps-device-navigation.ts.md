# scripts/test-maps-device-navigation.ts
- Lines: 403 | Kind: integration (real `DeviceMapsNavigation`, `bindAgentNavigation`, `withResidentMapsNavigation` with the real upstream `MapsController`/`SavedPlaces`; provider and screen surface are stubs) plus one source-text block | Verdict: KEEP, MOVE to `test/integration/maps-navigation.test.ts`, SIMPLIFY (delete the upstream text block)
- Covers: agent-requested Maps select/start/reroute/stop never starts guidance itself, stale/approximate/denied/silent fixes yield `awaiting-location`, cancellation by stop/newer/release/turn abort, user changes win, account change retires the binding, resident relay transport. Duplicates: Quint `specs/quint/refinement/services/maps.mjs` and `resident-maps-relay-offer.mjs` model the same ownership rules (keep both: model vs code). Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 109-130 | T1/T5 | Reads upstream blobs at the pin (`upstreamNativeSource`) and regex-matches type declarations and strings in `plugins/plugin-maps/src/navigation.ts`, `cloud-adapter.ts`, `service.ts`, `core-plugins.ts`, `optional-plugin-imports.ts`, `device-action-routes.ts`. | Delete; `tsc` against the upstream types already enforces the interface, and a broken relay would fail the transport case below. | None |
| 2 | 370 | - | `console.log` success line in the middle; a later block follows. | Remove with the move to `test()` blocks. | None |
| 3 | 258, 269, 294, 335, 362 | T8 | `setTimeout(1)` polling / fixed 1 ms waits for the locate call. | Await a promise resolved by the surface `locate` stub. | Low |
| 4 | 64-107 | - | The scripted `screen()` surface mirrors `prototype/maps-adapter.ts` semantics by hand. | Keep (it is the boundary fixture); move to `test/fixtures/maps-surface.ts` if the reroute journey does not replace it. | Low |

## Proposed end state
`test/integration/maps-navigation.test.ts` (~370 lines, 10 `test()` cases), no upstream text block, no shim, no `upstream-native-source.ts` import.
