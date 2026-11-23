# scripts/run-node-tests.ts
- Lines: 18 | Kind: test runner wrapper | Verdict: SIMPLIFY
- Covers: `npm test` puts forwarded `node --test` options before the suite globs (Node treats arguments after the file list as files). Duplicates: none. Callers: `package.json` `test`; `.github/workflows/browser.yml:76` sets `ALPHA_TEST_CONCURRENCY=1`; `test/node-test-runner.test.mjs` copies and runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | B3 | Validates `ALPHA_TEST_CONCURRENCY` that `node --test` validates itself. | Drop the env var: browser.yml passes `npm test -- --test-concurrency=1` (a later flag wins). Default `--test-concurrency=4` stays in the argv. | Low |
| 2 | 12-18 | B1 | try/catch that reformats a spawn error. | Let it throw. | — |
| 3 | — | T5 | `test/node-test-runner.test.mjs` tests this wrapper. | Delete the test. | Low |
| 4 | 14 | T4 | `test/*.test.ts` glob: confirm whether any `.test.ts` exists after the test cleanup; drop the glob if none. | Check after stage E. | — |

## Proposed end state
Six lines: `runChild(process.execPath, ['--test','--test-concurrency=4','--test-timeout=600000', ...argv, globs])` then `exitFromChild`.
