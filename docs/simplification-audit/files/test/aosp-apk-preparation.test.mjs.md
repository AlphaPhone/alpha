# test/aosp-apk-preparation.test.mjs
- Lines: 5 | Kind: wrapper (spawns `python3 test/aosp-apk-preparation.py`) | Verdict: DELETE
- Covers: nothing itself; runs the Python suite. Duplicates: none. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | T9 | One-line wrapper that spawns the real test; `stdio:'pipe'` hides the Python failure output on error. | Delete with the Python suite (see its report). If that suite stays, register it in the single Python runner instead. | none |

## Proposed end state
Gone. Python suites are run once, by one runner.
