# test/inbox-retention-cases.test.mjs
- Lines: 9 | Kind: wrapper (spawns `node --import tsx --test scripts/test-inbox-retention-cases.ts` and greps `tests 9`/`fail 0`) | Verdict: MERGE (move `scripts/test-inbox-retention-cases.ts` body into `test/integration/inbox-gmail.test.ts`; delete this wrapper)
- Covers: an open message survives part failures (stale body refresh, resume check, attachment, conversation page); a revoked grant still closes it; an aborted read keeps cursor and offline snapshot. Duplicates: none for the behaviour; wrapper duplicates node:test. Callers/importers: `npm test` glob; the script is called only from here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | T9 | A child process whose stdout is regex-matched for `tests 9`: adding a case to the script breaks this wrapper (B5 exact-count). | Move the script's tests into the inbox integration file; delete the wrapper. | Low |
| 2 | 6 | T8 | Fixed 30 s timeout per child plus a second Node start. | Gone with the move. | Low |

## Proposed end state
File deleted; `scripts/test-inbox-retention-cases.ts` and its `scripts/inbox-adapter-fixture.ts` dependency move to
`test/integration/` (the fixture becomes `test/integration/fixtures/inbox-adapter.ts`).
