# scripts/ci/test-resident-phase.py
- Lines: 48 | Kind: tooling / integration (spawns real `resident-phase.py` supervisor with real child processes and signals) | Verdict: MOVE to `test/ci/resident-phase.test.py`, run in ONE workflow
- Covers: `scripts/ci/resident-phase.py` reports success, failure exit code, timeout, SIGTERM interrupt and orphan-group cleanup with a JSON state file. Duplicates: none. Callers: `.github/workflows/resident-prepare.yml:31` and `.github/workflows/resident-android.yml:244` (both `python3 scripts/ci/test-resident-phase.py`); not in `npm test` because of the `GITHUB_ACTIONS` assertion.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | T9 | `assert sys.platform=='linux' and GITHUB_ACTIONS=='true'` hard-fails anywhere else, so the test cannot run locally or in `npm test`. | Replace with a `unittest.skipUnless(sys.platform=='linux')`; drop the `GITHUB_ACTIONS` requirement (it never touches Android). | Low |
| 2 | wf | P3 / T4 | Runs in two workflows (`resident-prepare.yml`, `resident-android.yml`) on the same commit; takes ≈5 s plus a 2 s timeout case. | Run it once, in the lane that changes when `scripts/ci/resident-phase.py` changes (path-filtered), or in the Python suite runner. | Low |
| 3 | 45-47 | B5 | Writes `test-results/resident-ci-supervisor/result.json` receipt; grep finds no reader. | Delete the receipt; rely on exit code. | Low |
| 4 | whole | T9 | Test lives in `scripts/ci/`. | Move to `test/ci/`. | Low |

## Proposed end state
A ~35-line `unittest` in `test/ci/` that spawns the real supervisor five times, skipped off Linux, run once per change to `scripts/ci/resident-phase.py`. No result receipt.
