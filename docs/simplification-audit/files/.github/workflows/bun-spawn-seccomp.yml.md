# .github/workflows/bun-spawn-seccomp.yml
- Lines: 60 | Kind: dispatch-only one-off reproduction workflow | Verdict: DELETE (with `scripts/ci/reproduce-bun-spawn-seccomp.py`)
- Covers: reproduces a Bun 1.4.2 spawn/seccomp failure on glibc and musl (Alpine container, strace). Duplicates: none. Callers/importers: dispatch only; ran twice on 2026-10-03, never since (research §2.5/§3). `git grep bun-spawn-seccomp` → only `scripts/ci/affected.ts:38` (regex) and `scripts/ci/reproduce-bun-spawn-seccomp.py` (its own script). No test reads it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P4/A7 | One-off upstream bug reproduction; no product or release gate depends on it. | Delete the workflow and `scripts/ci/reproduce-bun-spawn-seccomp.py`; drop `bun-spawn-seccomp` from the `affected.ts:38` regex. | None; recoverable from git if the Bun bug resurfaces (it belongs in an upstream Bun/eliza issue). |
| 2 | 28-45 | C3 | Inline Python loads `scripts/ci/acquire-resident-bun.py` via `importlib` and re-pins the musl asset hashes already in the Bun lock. | Gone with #1. | None. |

## Proposed end state
File deleted.
