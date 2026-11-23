# scripts/ci/test-resident-uid-crash-audit.py
- Lines: 28 | Kind: tooling (unittest of `resident_uid_crash_audit.collect_crashes` with `Popen` patched to a real Python child) | Verdict: MOVE to `test/ci/resident-uid-crash-audit.test.py`; run via the Python suite runner
- Covers: crash collection for the resident UID is bounded (truncates, deadline), never persists raw output (PRIVATE_SENTINEL), and refuses non-emulator serials. Duplicates: `test/resident-crash-diagnostic.test.py` covers the projection layer (`resident_crash_diagnostic.py`) above it. Callers: `test/resident-crash-diagnostics.test.mjs` (a 5-line Node wrapper that only spawns it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | wrapper | T9 | `test/resident-crash-diagnostics.test.mjs` exists only to spawn this file; `test/python-suites.test.mjs` already is the runner for such suites. | Move file to `test/ci/`, add one line to `python-suites.test.mjs`, delete the wrapper. | Low |
| 2 | 13-21 | T3 | Patches `subprocess.Popen` but runs a real child, so the pipe-bounding and privacy behaviour is genuinely exercised. Worth keeping (privacy rule on CI evidence). | Keep both cases. | — |
| 3 | 22-26 | T8 | Hung-read case sleeps up to the module's deadline (child sleeps 30 s, deadline shorter); acceptable but is the slowest Python case. | Keep; confirm deadline is a few seconds. | Low |

## Proposed end state
`test/ci/resident-uid-crash-audit.test.py`, invoked by the shared Python suite runner; the Node wrapper deleted.
