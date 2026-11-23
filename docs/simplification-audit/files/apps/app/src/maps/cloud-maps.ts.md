# apps/app/src/maps/cloud-maps.ts
- Lines: 58 | Role: binds the upstream Cloud Maps provider to Alpha's connection controller: per-call client resolution, account-bound tile requests, one cached basemap per coverage, and retirement on account change | Verdict: SIMPLIFY
- Importers: 1 app (prototype/maps-adapter.ts:15). Loaded by test/cloud-maps-session.test.mjs:13,43 (esbuild with stubs) and specs/quint/refinement/services/maps-connection.mjs:43; mentioned by scripts/test-cloud-maps.ts:174 (comment).
- Text/path pins: test/subscription-entitlement.test.mjs:154-156 asserts this file is an importer of `readServiceLimit` (import graph pin); test/cloud-maps-session.test.mjs stubs the exact specifiers `'./cloud-provider'`, `'./cloud-session'`, `'./runtime'`, `'../runtime/connection-ui'`, `'../runtime/subscription-entitlement.ts'` — changing any import specifier here breaks that test; specs/quint/refinement/services/maps-connection.mjs:49 also resolves stubs by specifier and importer; specs/quint/services/manifest.json:351,400,4383 and symbol pins :4393-4441 (`retireCloudMaps`, `initializeCloudMaps`, `captureMapsSession`, `previous`, `mapsSession`, `accountClient`, `sameAccount`); specs/quint/application/manifest.json:9501,9541 (`cloudMapsBasemap`); specs/quint/legacy/maps/check-maps-refinement.mjs:28 (URL); test/support/feature-parity.mjs:317.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | A8 | The doc comment "Cloud supplies data only; retained routes belong to the session... Limits are read with the app's shared subscription reader..." sits above `type BoundClient`, not above the `createCloudMaps` call it describes | Move it to :34 | None |
| 2 | 16, 51 | C3 | `owner.sessionId !== now.sessionId \|\| owner.credentialId !== now.credentialId` and `previous?.sessionId !== next?.sessionId \|\| previous?.credentialId !== next?.credentialId` — two copies in this file, 6 renderer files total (see agent-navigation.ts report) | Use the shared `sameCloudBinding()` (cross-file action) | Low; the quint symbol pins name `sameAccount` and `previous`, keep those identifiers |
| 3 | 12 | C1 | `type BoundClient = NonNullable<ReturnType<typeof connectionController.getCloudClient>>` | Use the exported `CloudBinding` type from runtime/connection-ui.tsx (same type that replaces `CloudAccount` in agent-navigation.ts) | Low |
| 4 | 34-39 | D8 | `tileRequest:()=>{ const owner=...; return async(z,x,y,signal)=>{const bytes=await sameAccount(owner).client.mapsTile(z,x,y,signal);sameAccount(owner);signal.throwIfAborted();return bytes;};}` — three statements per line, mixed with the call's options | Split the tile request into a named `accountTileRequest()` function above the call; one statement per line | None |
| 5 | 54-57 | D9 | `if (changed) { if (maps.cloudMapsDiagnostics().configured) maps.retireCloudMaps(); }` nested ifs with two comments | `if (changed && maps.cloudMapsDiagnostics().configured) maps.retireCloudMaps();` keeping the one comment that explains the policy | None |
| 6 | 48-58 | D3 | Module-level `connectionController.subscribe(...)` at import time with no disposer; the subscription lives for the page | Keep (the module is a page-lifetime singleton), but say so in one comment; do not add a disposer nobody calls (B4) | None |
| 7 | 41-47 | — | `basemapCoverage`/`basemap` identity cache is load-bearing (application manifest pins `cloudMapsBasemap`, HeldPlaneDestroyed witness) | Keep | — |

B2/B3 check: `accountClient.mapsRequest` throwing when no client is the specified refusal ("Sign in to Cloud to use Maps.") — keep. `sameAccount` after the tile await is a real fence, not a check-act-check sandwich, because the account can change during the await.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `BoundClient` | type | 12 | `CloudAccount` maps/agent-navigation.ts:7; upstream `MapsSession` (cloud-session.ts:4) | runtime/connection-ui.tsx exported `CloudBinding` |
| `sameAccount` | helper | 14-18 | inline compares in agent-navigation.ts:24, browser/voice.ts, prototype/inbox-cloud-adapter.ts, runtime/google-accounts.ts | built on shared `sameCloudBinding()` |
| `accountClient` | const | 23-29 | none | stays |
| `mapsSession` | helper | 30-33 | none | stays |

## Proposed end state
~48 lines: imports via alias where they point upstream (keep the stubbed relative specifiers or update test/cloud-maps-session.test.mjs and maps-connection.mjs in the same commit), the comment moved to the provider call, `sameAccount` built on the shared compare, a named tile-request function, and a single-condition retirement subscription.

## Verification
test/cloud-maps-session.test.mjs; test/subscription-entitlement.test.mjs (import graph); quint services/maps-connection refinement and the application map-plane-ownership model; test/browser/global-basemap.spec.ts and owner-maps-attribution-refusals.spec.ts; `npm run verify`.
