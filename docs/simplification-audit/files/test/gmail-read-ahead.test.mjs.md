# test/gmail-read-ahead.test.mjs
- Lines: 5 | Kind: indirection (spawns `scripts/test-gmail-read-ahead.ts` as a child suite) | Verdict: MERGE (move the script's body into `test/integration/inbox-gmail-google.test.mjs`; delete both files)
- Covers: Gmail "Load more" read-ahead joins one speculative request, consumes a cursor once, and stays within owner/request/lifetime boundaries (`GmailReadAhead`, `gmail-account-selection`). Duplicates: none. Callers/importers: none; the script (26 lines) is called only by this file.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | T9 | A wrapper whose real test is a script outside `test/`, spawned with `--import=tsx`. | Move the assertions into the inbox integration as `test()` cases. | none |
| 2 | script | T3 | The script is a unit test of `GmailReadAhead` with a fake clock. | Keep its owner-isolation and single-consumption cases; they guard a privacy boundary (one owner's page never served to another). | low |

## Proposed end state
Gone; three read-ahead cases live in the inbox-gmail-google integration file.
