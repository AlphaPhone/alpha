# scripts/ci/recovery_ui_guard.py
- Lines: 112 | Kind: CI library (owned-user admission, display readiness, instrumentation transcript parser) | Verdict: KEEP, SIMPLIFY
- Covers: `owned()` proves the device has exactly user 0 and the owned secondary user; `admit_display()` waits (≤30 observations) until the secondary user is bound in power/window policy, awake and unlocked, setting an idle timeout and dismissing keyguard once; `terminal()` strictly parses AndroidJUnitRunner output for exactly one started+passed method. Duplicates: `resident-native.py:80-83` parses instrumentation output with weaker substring checks instead of `terminal()`. Callers/importers: `pending-recovery-ui.py:7`; `test-pending-recovery-phases.py:4`; `test-recovery-ui-guard.py` (npm test via `test/python-suites.test.mjs:25` and `resident-android.yml:569`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 88-111 | C5 | `terminal()` is the strict parser; `resident-native.py` has its own looser one. | `resident-native.py` uses `terminal()`; move it to the shared `resident_emulator.py`. | Low (stricter for resident-native; its output format is the same runner). |
| 2 | 23-86 | D9 | `admit_display` is a 60-line loop with four flags (`admitted`, `consecutive`, `wake_attempts`, `dismissed`) and two inline regex-rewrite tricks (39-41). | Split into named steps: `wait_bound()`, `install_idle_policy()`, `wake_and_dismiss()`, `wait_ready()`; keep the 30-observation budget. | Medium: emulator timing behaviour; only the emulator job proves it. |
| 3 | all | D8 | One-space indentation and `;`-joined statements. | Formatter (black/ruff format) once. | None. |
| 4 | — | T9 | Its unit test `test-recovery-ui-guard.py` runs twice (npm test and resident-android). | Run it once (npm test), moved to `test/`. | None. |

## Proposed end state
Part of `resident_emulator.py` (or kept as `recovery_ui_guard.py`), formatted, with `admit_display` split into named steps and `terminal()` used by both emulator runners.
