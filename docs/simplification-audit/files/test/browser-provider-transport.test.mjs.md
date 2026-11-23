# test/browser-provider-transport.test.mjs
- Lines: 23 | Kind: unit (T3; esbuild-bundles `runtime/browser-cloud-resident.ts` with a forced `import.meta.env` `{DEV:true, VITE_ALPHA_CLOUD_RESIDENT:'1'}` and stubs `globalThis.fetch`) | Verdict: MERGE into `test/browser-cloud-dev-bridge.test.mjs` (future `test/integration/connection-cloud.test.mjs`)
- Covers: the development Cloud-resident provider call accepts only the exact primitive status shape (rejects arrays in any field). Duplicates: `test/browser-cloud-dev-bridge.test.mjs:1177-1178` drives `residentProviderSelect` against the real dev-bridge handler over HTTP. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | D5/T3 | The module is only enabled in a DEV loopback host (`browserCloudResidentEnabled`), never in a built artifact; forcing the env define is how the test reaches it. | Run it through the dev-bridge integration, which is already that host. | none |
| 2 | 9-17 | T7 | 10 generated tests, one per field, for one validator. | One case with a representative array field. | none |
| 3 | 11-15, 20-22 | T8 | Global `fetch` monkey-patch without `t.mock`; a parallel test in the same process would see it. | Use the real HTTP server in the merged file. | low |

## Proposed end state
File deleted; `browser-cloud-dev-bridge`'s integration gets two cases: "provider select returns the exact status" and "a malformed status (array field) from the host is reported as Unavailable". Product validator stays (network boundary, B3-legit).
