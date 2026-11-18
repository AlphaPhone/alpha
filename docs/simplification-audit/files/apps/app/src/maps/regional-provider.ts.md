# apps/app/src/maps/regional-provider.ts
- Lines: 35 | Role: binds the upstream regional (self-hosted OSM) Maps provider; development prototype only — every input folds to empty unless `testMocksEnabled` | Verdict: SIMPLIFY + MOVE to a dev module (D5/D6)
- Importers: 1 app (prototype/maps-adapter.ts:14 — `initializeRegionalMaps`, `regionalMap`, `regionalDiagnostics`, `regionalMapsConfigured`); maps/map-plane.ts:5 (`nativeRegion`, `nativeRegionRequest`).
- Text/path pins: test/dev-surface-gates.test.mjs:100-120 reads this file, strips imports with `^import [\s\S]*?;\n`, rewrites `import.meta.env.VITE_MAPS_BASE_URL` and `^export (const|function|interface)`, vm-runs it with injected `createRegionalMaps`, `testMocksEnabled`, `devSurfacesEnabled`, `Capacitor`, `DailyApps`, `registerPlugin`, `configureMapsProvider`, and asserts `regionalDataset.providerId==='alpha-osm-monaco'` (T2); scripts/audit-production-bundle.ts:46 (comment naming this file for the `10.0.2.2:47850` gateway rule); test/support/feature-parity.mjs:326.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-18 | A7, D7 | `export interface RegionalDataset` and `export const regionalDataset = { providerId: 'alpha-osm-monaco', coverage: {region:'Monaco', bounds:[...]}}` — the comment says "documentation and tooling data only"; grep finds no reader in apps, android, scripts or specs; the only reader is test/dev-surface-gates.test.mjs:110,120. The Monaco id/bounds are owned by scripts/maps/dataset_manifest.py:48 and serve-region.py:8 | Delete lines 8-18 and the two assertions at test/dev-surface-gates.test.mjs:120 (and the `regionalDataset` name in its `globalThis.result` line 110) | Low |
| 2 | 20-23 | A8 | "development prototype (#412)" — issue-number tombstone | Drop "(#412)" | None |
| 3 | 24-32 | D5 | Four separate `testMocksEnabled ? x : empty` ternaries plus `development: devSurfacesEnabled` and `testMocksEnabled && (...)` in `developmentBuild` | One `const dev = testMocksEnabled;` and pass `createRegionalMaps(dev ? devOptions : disabledOptions)`; or (preferred, D6) move the whole binding into a dev-only module that `vite.config.ts` `disabledModuleSource` stubs, with production `regionalMapsConfigured=false` and no-op exports | Medium: map-plane.ts imports `nativeRegion`/`nativeRegionRequest` unconditionally, and the stub must export the same names; audit-production-bundle.ts must still see the gateway literal absent |
| 4 | 33 | C2 | `registerPlugin<RegionalOptions['transport']>('AlphaMapsTransport')` — single registration, fine | keep | — |
| 5 | 1 | D13 | deep relative import | alias | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `RegionalDataset` | interface | 11-14 | scripts/maps/dataset_manifest.py:48 (same data, Python) | delete |
| `regionalDataset` | const | 15-18 | scripts/maps/dataset_manifest.py:48, serve-region.py:8, scripts/maps/dev.ts:52 | delete (scripts own it) |
| `regionalBaseUrl` | const | 24 | none | stays |

## Proposed end state
~22 lines: the `createRegionalMaps` binding with one dev switch and no dataset descriptor; ideally living under `apps/app/src/dev/` behind the disabled-module stub so product bundles contain only the no-op exports.

## Verification
test/dev-surface-gates.test.mjs (edit the dataset assertions), `scripts/audit-production-bundle.ts` via `npm run verify` / Android build, android/app/src/androidTest MapsRegionalInstrumentedTest.java (device-only, not run by CI), test/browser specs using `?mode=dev` Maps.
