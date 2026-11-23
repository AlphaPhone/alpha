# specs/quint/refinement/services/maps-connection.mjs
- Lines: 140 | Kind: Quint model-trace replay (bundles real modules; **one line sliced from product text**) | Verdict: PORT (stop slicing `readCloudMaps` out of `maps-adapter.ts`), then KEEP
- Covers: `MapsConnection.qnt` — Cloud Maps provider install/retire across account changes, client rebuilds, resident readiness, in-flight capability reads, guarded vs. unguarded reads, request outcome and guidance drop on deconfiguration. Duplicates: run twice — `test/quint-maps-connection.test.mjs` and `services/forward-replays.mjs` (aggregate). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-30, 46 | T10 / T2 | Reads `apps/app/src/prototype/maps-adapter.ts` as text, keeps the single line starting `const readCloudMaps = ` (today line 84) and pastes it into the bundle stdin. Any reformat (D9 Prettier) or move breaks it. | Product: move `readCloudMaps` (one line: diagnostics-configured-and-no-error ? resolve : `initializeCloudMaps()`) into `apps/app/src/maps/cloud-maps.ts` as an export and import it from `maps-adapter.ts`. Harness: `export {readCloudMaps} from './apps/app/src/maps/cloud-maps.ts'`. | low |
| 2 | 32-39, 48-52 | T10 (specifier) | Stubs keyed on literal import specifiers `'../runtime/connection-ui'`, `'../runtime/subscription-entitlement.ts'`, `'./cloud-provider'` (the last only when imported from `cloud-maps.ts`). Renaming an import breaks the port silently (stub not applied → real module loaded). | Accept for now (imports, not text); on merge into the shared `sourceModule`, make unmatched stub keys an error. | low |
| 3 | 40-54 | C5 | Own esbuild bundling + `data:` import, also in `maps-guidance-voice.mjs:32-40`, `inbox-workflows-model-traces.mjs:118-136`, `support.mjs:19`. | Use shared `sourceModule`. | none |
| 4 | 1-15 | — | Good header comment (states what is observed and what is not). | Keep. | none |
| 5 | 24-25 | — | `counterfactual` cuts traces before `pinnedClientRequest` (model action with no code counterpart). | Keep; fine. | none |

## Proposed end state
~120 lines: imports `readCloudMaps` as an export, builds via the shared `sourceModule` with specifier stubs, runs `modelTraces` + `replayTraces` from the merged ITF library. One test wrapper; `forward-replays.mjs` entry deleted.
