# scripts/ci/resident-phase.py
- Lines: 49 | Kind: CI supervisor (process group, deadline, disk floor, log capture) | Verdict: KEEP, SIMPLIFY
- Covers: runs a command in its own session with a deadline (≤7200 s), a 10 GiB start / 4 GiB running free-disk floor, logs to `test-results/resident-ci/<name>.log`, prints the last 16 KiB on failure, kills the group on exit and writes a JSON state record. Duplicates: GitHub `timeout-minutes` covers the deadline at step level. Callers/importers: ~25 steps in `.github/workflows/resident-android.yml` (113-606), `resident-prepare.yml:32-53`, `digest-restart.yml:43`; tested by `scripts/ci/test-resident-phase.py` (runs in both `resident-android.yml:244` and `resident-prepare.yml:31`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21 | D10 | Per-phase deadline duplicates step `timeout-minutes`; the part GitHub does not give is group cleanup and the disk floor. | Keep; optionally replace `--seconds` with step `timeout-minutes` and keep only disk floor + group kill. | Low. |
| 2 | 6 | T9 | `assert GITHUB_ACTIONS == 'true'` makes it (and its test) unrunnable locally. | Keep the guard on the supervisor (it kills process groups); run its test in one workflow only. | None. |
| 3 | 47 | B5 | Writes `<name>.json` state records; consumed only as uploaded artifacts for diagnosis. | Keep (useful when a 3-hour job fails). | — |
| 4 | all | D8 | Statement soup. | Formatter. | None. |

## Proposed end state
Same behaviour, formatted, with a `main()`; its test runs once (in the workflow that changes when it changes).
