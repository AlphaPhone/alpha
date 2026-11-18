# test/node-test-runner.test.mjs
- Lines: 24 | Kind: tooling (copies `scripts/run-node-tests.ts` and `scripts/child-command.ts` into a temp repo and runs them) | Verdict: DELETE
- Covers: `npm test` forwards `--test-name-pattern` and the exit status. Duplicates: every CI run of `npm test` proves exit status. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | Tests the 18-line test runner wrapper. | Delete. | None |

## Proposed end state
File deleted.
