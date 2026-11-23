# test/cloud-reachability.test.mjs
- Lines: 83 | Kind: integration-lite (real `identityReadRefused`/`cloudUnreachable` from `runtime/subscription-entitlement.ts` composed with the real shared `CloudResidentBindingController` from `.eliza/client-features`; only the Cloud read is synthetic) | Verdict: MERGE into `test/integration/connection-cloud.test.mjs`
- Covers: a failed Cloud identity read unbinds and demands sign-in only when Cloud refused the credential (401, expired, missing, account changed); every other failure is "offline" and keeps a recent plan under the 7-day offline rule. Duplicates: partly `test/cloud-protocol-error-copy.test.mjs` (copy for the same errors); Quint `specs/quint/refinement/application/cloud-plan-recheck.mjs` models plan recheck. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-13 | C1 | Local copy of `CloudProtocolError` ("without loading the Capacitor-bound modules"). The test classifies a look-alike, not the real class. | Import the real error once `cloud-protocol.ts` loads in Node (Vite SSR in the integration file already does). | Low |
| 2 | 37-52 | T3 (acceptable) | Two classifier tables. Pure, risk-bearing (decides when the owner is signed out). | Keep as table rows in the merged case. | None |
| 3 | 56-83 | - | Real binding controller admitting with each error: this is the only check that the 7-day rule and the refusal rule combine as specified. | Keep as the main case. | None |
| 4 | 1-4 | A8 | Ticket id `tst-alphaphone-1-036` and "Evidence class" header. | Drop. | None |

## Proposed end state
One case in `test/integration/connection-cloud.test.mjs`: "identity read refusal vs offline", iterating the refusal and offline tables through the real binding controller with the real `CloudProtocolError`. The two classifier tables stay as row lists in that case.
