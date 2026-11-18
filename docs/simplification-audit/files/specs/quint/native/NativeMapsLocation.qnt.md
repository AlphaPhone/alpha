# specs/quint/native/NativeMapsLocation.qnt
- Lines: 263 | Kind: Quint model (live, `native` manifest; TS refinement harness that imports the real module) | Verdict: KEEP; MOVE to the `application` family; drop manifest `symbols`
- Covers: the renderer `NativeMapsLocation` owner (`apps/app/src/maps/native-location.ts`): serial admission, generation fence across every await of `start()`, permission-while-hidden waits for the front, listeners before watch, unconfirmed cleanup refuses the next start, one error report per session. Duplicates: `test/quint-native-maps-location.test.mjs` and the native aggregate both replay it (via `forward-replays.mjs:24`). Callers/importers: `native/manifest.json` (11 tests, 14 invariants, 8 witnesses, 5 `symbols`, 2 upstream `sharedSources`), harness `refinement/native/maps-location.mjs`; also referenced by `application/map-plane-ownership.mjs`, `maps-event-return.mjs`, `services/trigger-cursor-replay.mjs`, `services/manifest.json`, and product comments in `maps/native-location.ts`, `maps/state.ts`, `browser/workflow-location.ts`, `workflow-trigger-runtime.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - (target state) | `maps-location.mjs:26-41` bundles the real `native-location.ts` with esbuild, stubbing only `../platform-plugins` and `@capacitor/core`, and drives the exported class. This is the import-and-run shape the brief asks for. | Keep as the reference pattern for porting other harnesses. | - |
| 2 | manifest | T10 | `symbols` pins `NativeMapsLocation`, `SharedLocation`, `ElizaLocation` in `native-location.ts`, `navigationLocation` in `prototype/maps-adapter.ts`, `NativeMapsLocation` in `maps/state.ts` (regex at load of every Quint command). `maps-adapter.ts` and `state.ts` are never loaded by the harness. | Delete `symbols`; keep `sources: [apps/app/src/maps/native-location.ts]` (path trigger only). | M: `maps-adapter.ts` is a D2/D3 restructuring target |
| 3 | manifest | D11 | A renderer TypeScript model in the `native` family (it was named after the Capacitor plugin). | Move to `specs/quint/application/` with its harness (or to a per-feature `maps/` folder per research §2.11). Update `forward-replays.mjs`, the test path and the services manifest reference. | L |
| 4 | 205-210 | - | `OneShotIsMintedSession` sits among the witnesses but is used in `safety` and listed as an invariant. | Move it up with the invariants. | L |
| 5 | test wrapper | T4, B5 | `test/quint-native-maps-location.test.mjs` asserts `scenarios 11`, `witnesses 8`, `traces = +60`; the aggregate replays the same model again. | One runner; keep the per-action coverage assertion, drop exact counts. | L |

## Proposed end state
Same model under `application/` (or `maps/`), tied to `native-location.ts` by path only, replayed once by its own test.
