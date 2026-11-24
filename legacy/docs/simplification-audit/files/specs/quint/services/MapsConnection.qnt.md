# specs/quint/services/MapsConnection.qnt
- Lines: 205 | Kind: Quint model, live (services manifest, 13 `symbols` pins, 6 witnesses) | Verdict: KEEP; harness PORT (one guard slice)
- Covers: Cloud Maps coverage reads: once per signed-in account (launch when resident is ready, first open, or search after failure), superseded reads cannot install, only an account change retires an installed provider, a rebuilt client keeps requests and guidance working (8 runs, 13 invariants). Duplicates: none. Callers/importers: manifest (also referenced from `specs/quint/application/manifest.json`); `refinement/services/maps-connection.mjs` (esbuild bundle of the real `cloud-maps.ts`, `agent-navigation.ts`, `runtime.ts`, `cloud-provider.ts` with `connection-ui` stubbed), registered in `forward-replays.mjs`; `test/quint-maps-connection.test.mjs`; aggregate via `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `maps-connection.mjs:29-30` | T10 | Reads `apps/app/src/prototype/maps-adapter.ts` as text and keeps the single line starting `const readCloudMaps = ` to evaluate the adapter's guard. | PORT: move `readCloudMaps` to `apps/app/src/maps/runtime.ts` (or `cloud-maps.ts`) as an export the adapter calls; the harness imports it. | Low |
| 2 | 104-116 | — | `pinnedClientRequest` and `unguardedRead` are counterfactual actions outside `step`, used only to show the invariants would fail (`readKeepsGuidanceTest`, `rebuiltClientKeepsRequestsWorkingTest`). Useful as documented negative witnesses. | Keep. | — |
| 3 | manifest `symbols` | T10 | 13 names (`retireCloudMaps`, `initializeCloudMaps`, `captureMapsSession`, `readCloudMaps`, …) pinned by regex; harness imports most of them. | Delete `symbols`. | None |
| 4 | manifest `sources` | — | Includes `connection-ui.tsx` (god module, stubbed in the harness). | Drop it from `sources` once the stub is the only contact. | Low |
| 5 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged; `readCloudMaps` exported from a maps runtime module and imported; no symbol pins; path filter `apps/app/src/maps/*.ts`, `maps-adapter.ts`, upstream `plugin-maps/src/client/*`.
