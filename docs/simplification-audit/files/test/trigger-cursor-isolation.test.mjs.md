# test/trigger-cursor-isolation.test.mjs
- Lines: 27 | Kind: test of test machinery (T5) + re-run of Quint replay cases (T4) | Verdict: DELETE
- Covers: that importing and running `specs/quint/refinement/services/trigger-cursor-replay.mjs` cases restores `alphaTriggerDevice`, `document`, `window`, `localStorage` descriptors, also after a forced assertion failure, so a later PGlite campaign in the same process can start. Duplicates: `test/quint-trigger-cursor.test.mjs` runs the same three cases (120 s and 240 s timeouts). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T4 | Runs `runTriggerCursorCase1..3` again, including the random-walk case 2 (240 s budget in the twin). | Delete. Biggest single saving in this chunk. | none |
| 2 | 15-20 | T5 | Mocks `assert.deepEqual` to throw to test the harness's own cleanup. | Delete. | none |
| 3 | 22-26 | T5 | Boots PGlite only to prove the environment is clean. `node --test` already runs each test file in its own process (default `--test-isolation=process`, used by `scripts/run-node-tests.ts`), so cross-file global leakage cannot occur. | Delete. | none |

## Proposed end state
Deleted. If the harness leaks globals inside its own file, `quint-trigger-cursor.test.mjs` fails; that is enough.
