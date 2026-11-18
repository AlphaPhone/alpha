# test/cloud-protocol-error-copy.test.mjs
- Lines: 46 | Kind: source transplant (slices `connection-ui.tsx` between `/** A code that expired on the code step` and `/** A resident start that does not open the dialog`, strips types, `vm`) | Verdict: DELETE
- Covers: Cloud protocol failures map to owner copy ("Unavailable", "Couldn't check", "Account changed", sign-in expired, "Agent starting") and the code/status go only to the diagnostic log. Duplicates: partly `test/cloud-reachability.test.mjs` (classifies the same errors), `test/browser/saved-signin-retry.production.spec.ts` (expired sign-in copy). Callers/importers: `npm test` glob; imports `test/fixtures/ts-source.mjs` (a second strip-types helper; 5 importers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T2 / D7 | Marker-comment slicing of the 4.2k-line god module; breaks on any split (D1). | Delete. | None |
| 2 | 14 | T3 | Re-declares `CloudProtocolError` locally ("node cannot strip parameter properties"), so the test runs against a copy of the class shape. | Delete. | None |
| 3 | 4 | C5 | Uses `fixtures/ts-source.mjs` while most siblings use `support/strip-types.mjs`; two helpers for one job. | Retire `ts-source.mjs` when its last importer goes. | None |

## Proposed end state
Deleted. Once `errorMessage` lives in its own module (connection-ui split, stage F), its table (500/502/408/429 -> Unavailable; invalid-response/403/404 -> Couldn't check; 401 -> sign-in copy; 503 -> Agent starting) belongs as one case in `test/integration/connection-cloud.test.mjs`. Until then the copy is visible in `journeys/connection-cloud.spec.ts` by answering the cloud fake with 500 and 401.
