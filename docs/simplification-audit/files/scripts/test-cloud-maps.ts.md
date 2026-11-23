# scripts/test-cloud-maps.ts
- Lines: 221 | Kind: integration (real `createCloudMaps` + real upstream `MapsController`/`SavedPlaces` + `captureMapsSession`, stubbed Cloud request) with a large unit table of `cloudMapsFailure` copy | Verdict: MOVE to `test/maps-cloud.test.ts` (node:test cases); shrink the failure-copy asserts to one table
- Covers: Cloud Maps provider: signed-out stays unconfigured, coverage configures search/details/route through the shared controller, typed Cloud refusals map to device failures with bounded retry hints, a late older coverage response cannot replace the current provider, an account change mid-request rejects the result and sends no coordinates to the new account, opaque place IDs pass through. Duplicates: `test/browser/owner-maps-attribution-refusals.spec.ts` (refusal copy in UI), `test/managed-service-routes.test.mjs` (routes), `test/maps-navigation.test.mjs`. Callers/importers: `test/adapter-contracts.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 104 | — | `console.log('PASS ...')` in the middle; later blocks run after "PASS" is printed. | Gone when split into `test()` cases. | L |
| 2 | 143-200 | T3, T4 | ~30 asserts on exact English copy of `cloudMapsFailure` (rate-limit seconds, reset dates, allowance wording, invalid hints). Several repeat the UI spec. | One table test: code mapping for each Cloud code, plus 3 copy rules (retry hint shown, no AI/credits wording, invalid hint falls back). | L |
| 3 | 191-199 | T8 | Monkey-patches `Date.now` globally. | Inject `now` if `cloudMapsFailure` takes it, else keep with try/finally (as now). | L |
| 4 | whole | T9 | Child-process shim in `adapter-contracts.test.mjs`. | Import directly in `node:test`. | L |

## Proposed end state
`test/maps-cloud.test.ts` with 7 cases (signed out, configured route, refusal table, stale coverage, account change, retry hint not retried, opaque IDs).
