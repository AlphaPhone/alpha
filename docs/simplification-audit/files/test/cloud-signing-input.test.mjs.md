# test/cloud-signing-input.test.mjs
- Lines: 10 | Kind: wrapper (spawns `python3 -B test/cloud-signing-input.test.py`) | Verdict: DELETE; add the suite to `test/python-suites.test.mjs` (proposed `test/tooling/python.test.mjs`)
- Covers: nothing itself; runs the Python release-admission suite. Duplicates: `test/python-suites.test.mjs` is the collector for exactly this kind of suite. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-10 | T9 | One-line wrapper; output is piped (`stdio:'pipe'`) and discarded, so a failure shows no unittest output. Not isolated (`-B` only, unlike the collector's `-I`). | Add `test('Cloud signing admission', ()=>run('cloud-signing-input.test.py'))` to the Python collector and delete this file. | None |

## Proposed end state
Deleted; one line in the Python collector.
