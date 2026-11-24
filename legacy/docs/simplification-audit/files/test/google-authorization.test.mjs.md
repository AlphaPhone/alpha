# test/google-authorization.test.mjs
- Lines: 9 | Kind: unit (pure URL allow-list `googleAuthorizationUrlAllowed`, real import) | Verdict: MERGE into `test/integration/connection-cloud.test.mjs` (keep every case)
- Covers: only managed Google consent URLs (production or staging callback, code flow, bound state, non-deletion scopes) open in the browser; foreign callbacks, credentials in the URL, extra params, fragments, duplicate state, `token` flow and `https://mail.google.com/` scope are refused. Duplicates: none. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | One pure function, but it is a trust boundary (what URL the phone hands to the browser). The audit keeps such cases (T3 exception: risky pure algorithm). | Move the cases unchanged into the connection-cloud integration file (security block). | none |
| 2 | 2-9 | D8 | Dense lines. | Format on move. | none |

## Proposed end state
The same twelve accept/refuse cases, formatted, in the connection-cloud integration suite.
