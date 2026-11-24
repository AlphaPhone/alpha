# scripts/ci/resident_crash_diagnostic.py
- Lines: 116 | Kind: CI library (optional crash projection after lost-rpc failure) | Verdict: MERGE with `resident_uid_crash_audit.py` into `scripts/ci/resident_crash.py`
- Covers: after a failed lost-rpc phase, reads the crash log buffer (bounded, 10 s) and returns a fixed-schema record of the one SIGSYS/SECCOMP crash that matches the recovery proof's worker pid, uid and start time. Duplicates: `resident_uid_crash_audit.py` (same failure, same crash buffer, own `bounded_read` at 47-67 vs here 13-34, own SIGSYS/seccomp regexes). The module docstrings explain why both exist (one needs the proof, one does not). Callers/importers: `resident-native.py:98` (lazy import); `test/resident-crash-diagnostic.test.py` (in npm test via `python-suites.test.mjs:27`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-34 | C3 | Second bounded subprocess reader. | One `bounded_read(argv, deadline, limit)` in the merged module. | Low. |
| 2 | 36-78 | C5 | Second crash-buffer parser (`-v threadtime -v epoch -v uid` here, `-v brief` there). | One logcat read (`threadtime epoch uid`) and one parser; the pid/time binding becomes an optional filter. Two output files can stay if the owner campaign reads both; otherwise one. | Low; diagnostics only (never decide pass/fail). |
| 3 | 113-116 | B1 | Catch-all to a fixed classification: intended (never serialise messages). | Keep. | — |

## Proposed end state
`resident_crash.py` (~110 lines total for both modules) with one reader, one parser, `capture_projection()` and `collect_uid_crashes()`; one test file.
