# test/redeemed-plan-end.test.mjs
- Lines: 91 | Kind: transplant (T2) regression test | Verdict: REWRITE as `test/integration/connection-cloud.test.ts` cases
- Covers: Regression spec-subscription-F01: a redeemed plan end (including "no end") wins over the stored record during resident admission and survives the re-verify restart, but not for another account. Duplicates: Partly `test/subscription-entitlement.test.mjs` (entitlement module) and Playwright `native-cloud-subscription.spec.ts` (redeem UI). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-19, 65 | T2 | Concatenates five `connection-ui.tsx` sections cut at doc-comment anchors (`/** Notice shown when Cloud inference`, `/**\n * A new key was stored`, ...), strips types and runs them in a vm with ~40 injected names. | Rewrite against an exported `admitCloudResident`/`residentRedeem` with ports once `connection-ui.tsx` is split (D1). | Medium |
| 2 | 42-91 | carry | Five behaviour cases, real bug regression. | Carry all five. | Medium |

## Proposed end state
- Five cases in the connection-cloud integration file using real imports.
