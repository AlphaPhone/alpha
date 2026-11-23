# test/packaged-runtime.test.mjs
- Lines: 7 | Kind: wrapper (spawns `python3 test/packaged-runtime.test.py`) | Verdict: DELETE
- Covers: nothing itself. Duplicates: `test/python-suites.test.mjs` is the collector for Python suites (its header says packaged-runtime "has its own wrapper"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-7 | T9 | One-file Python wrapper; also runs without `-I` unlike the collector, so the Python test can import from the cwd. | Delete; if the Python suite stays, add one line to `python-suites.test.mjs`; if `verify-packaged-runtime.py` is ported to TypeScript (scripts report), the TS test replaces both. | Low |

## Proposed end state
Deleted. See `test/packaged-runtime.test.py.md` for where the cases go.
