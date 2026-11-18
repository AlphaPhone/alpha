# test/google-accounts.test.mjs
- Lines: 1 | Kind: indirection (`import '../scripts/test-google-accounts.ts'`) | Verdict: MERGE (move `scripts/test-google-accounts.ts` into `test/integration/calendar-google.test.mjs` with the `google-calendar-connect` part A cases; delete both)
- Covers: `createGoogleAccounts` connect/list/disconnect calls and disconnect copy (93-line script, bundled with esbuild). Duplicates: `google-calendar-connect.test.mjs` bundles the same module "as scripts/test-google-accounts.ts does" (its line 17). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | T9 | The test is a script outside `test/`. | Move the script into `test/` as part of the Google/Calendar integration file; one esbuild bundle of `google-accounts.ts` shared by all its cases. | none |

## Proposed end state
Gone; its cases are in one Google/Calendar integration file next to the link-status cases.
