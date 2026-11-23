# scripts/ci/resident_uid_crash_audit.py
- Lines: 81 | Kind: CI library (UID-owned seccomp crash and audit-denial record) | Verdict: MERGE into `scripts/ci/resident_crash.py` (with `resident_crash_diagnostic.py`)
- Covers: after any lost-rpc failure, reads `logcat -b crash` (brief) and `dmesg` (bounded, 5 s) and keeps up to 16 seccomp crash/audit records whose UID is the owned app and whose executable is the packaged Bun/musl runtime. Duplicates: `resident_crash_diagnostic.py` (bounded reader, crash-buffer parse). Callers/importers: `resident-native.py:6,114`; `resident_crash_diagnostic.py` (docstring only); `scripts/ci/test-resident-uid-crash-audit.py` (run from `test/resident-crash-diagnostics.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-67 | C3 | Third bounded subprocess reader variant (non-blocking `os.read`). | Shared reader. | Low. |
| 2 | 8-31 | C5 | Crash-buffer parser overlapping `resident_crash_diagnostic.project`. | One parser in `resident_crash.py`. | Low. |
| 3 | 33-45 | — | `dmesg` audit (type=1326) parsing is unique and useful. | Keep in the merged module. | — |

## Proposed end state
Functions `project_audit` and `collect_uid_crashes` inside `resident_crash.py`; its test merged into `test/resident-crash.test.py`.
