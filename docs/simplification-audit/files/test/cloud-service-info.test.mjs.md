# test/cloud-service-info.test.mjs
- Lines: 9 | Kind: unit (real `parseCloudServiceInfo`, pure validator at the network boundary) | Verdict: MERGE into `test/integration/connection-cloud.test.mjs`
- Covers: Cloud public service documents keep their text and reject incomplete, foreign-version and credential-bearing responses. Duplicates: `test/cloud-readiness.test.mjs` checks the same endpoint shape from the operator script (different code). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T3 (acceptable) | Trust-boundary parser, no stubs. | Fold the valid row and six invalid rows into one case of the integration file. | None |

## Proposed end state
Six-row table inside `test/integration/connection-cloud.test.mjs`; file deleted.
