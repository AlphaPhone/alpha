# test/cloud-resident-authority.test.mjs
- Lines: 80 | Kind: mixed: build-flag integration (cases 1-5 esbuild-bundle real `cloud-protocol.ts`, `browser-cloud-resident.ts`, `native-connection.ts`, `development-cloud-voice.ts` with `import.meta.env` defined per case and import the bundle), source transplant (cases 6-7 slice `export function browserCloudDevBridge()` out of `scripts/browser-cloud-dev-bridge.ts` and run it through `new Function` with injected dependencies) | Verdict: MERGE cases 1-5 into `test/release/build-gating.test.mjs` (or the production-bundle audit); DELETE cases 6-7
- Covers: only explicit development builds admit the staging Cloud resident; the browser Cloud sign-in hand-off exists only in test-mocks and loopback resident builds; the staging transport allowlist accepts only identity/entitlement routes on the exact host; development Cloud voice needs the resident flag and is off on native; the private-preview email sign-in host needs all preview flags; the dev bridge mounts only with all gates and forwards a valid profile mode. Duplicates: `test/browser-cloud-dev-bridge.test.mjs` (~85 cases on the same bridge), `scripts/audit-production-bundle.ts` (production gating on the real bundle), `test/browser/connection-boundaries.production.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | - | Bundling the real modules with defined env is a sound way to test build gating. Cost: about 20 esbuild bundles per run (each `protocol(env)` call bundles four modules). | Keep, but cache bundles per distinct env and keep only the gate rows that the production audit cannot see (development-only admissions). | Low |
| 2 | 42-48 | D8 | Inconsistent indentation; mutates `globalThis.androidBridge`. | Reformat when merged. | None |
| 3 | 50-53 | - | Private-preview email host case patches `globalThis.fetch`. | Keep as one row. | Low |
| 4 | 55-80 | T2 | Slices the dev-bridge function text and re-binds its imports by position. Breaks on any import change. | Delete; `browser-cloud-dev-bridge.test.mjs` already imports the bridge. Add its two gate rows (all four preview flags required; profile mode lean/full/unknown) there if missing. | Low |
| 5 | 33-40 | T3 | Allowlist rows are trust-boundary checks; keep. | Keep. | None |

## Proposed end state
Cases 1-5 become one parameterised "build flag gating" file in `test/release/` with a table of `{env, expected admissions}`; production-only rules move to `audit-production-bundle.ts`. Cases 6-7 are deleted in favour of the existing bridge test.
