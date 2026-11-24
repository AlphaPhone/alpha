# scripts/ci/test-pending-recovery-phases.py
- Lines: 174 | Kind: source transplant (AST-slices `pending-recovery-ui.py` and execs fragments with a fake `adb`) | Verdict: DELETE
- Covers: parses `pending-recovery-ui.py`, extracts `PHASES`, `OWNER_PREPARED`, `approval_receipt` and the inner phase loop, and runs them 39 faults × 2 variants against a scripted `run()`; asserts the method order, per-phase options/permissions/runner, owner-prepare runs, receipt parsing, and that a failed foreground switch retains (never removes) the owned user; also execs the sliced `switch()` helper against six `dumpsys` scenarios. Duplicates: the real behaviour is exercised by `pending-recovery-ui.py` on the emulator (`resident-android.yml` job `recovery-ui`). Callers/importers: `test/python-suites.test.mjs:26` (npm test) and `.github/workflows/resident-android.yml:570` (runs twice: research 2.11).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 144-145 | T2 | Cuts code out of the product script with `ast` and `exec`s it with injected globals; breaks on any refactor of the script (e.g. adding `main()`). | Delete. | — |
| 2 | 9, 138 | T7 | 39 named faults and a hand-maintained `count=` ladder keyed to phase indices: every added phase edits this file. | Delete. | — |
| 3 | 125-133 | coverage | The only offline check that cleanup preserves an owned user when the switch back to user 0 fails. | If wanted after `pending-recovery-ui.py` gains `main(run=...)`, write one small test of the cleanup path with a fake `run` (not a transplant). Otherwise the emulator job is the proof. | Medium: the emulator job runs only on main push and has not been green in 40 runs, so offline coverage of the cleanup contract goes to zero. |
| 4 | — | T4 | Runs in npm test and in resident-android. | Moot after delete; remove both call sites. | None. |

## Proposed end state
Deleted; `test/python-suites.test.mjs:26` and `resident-android.yml:570` lines removed. Optional replacement: a cleanup-contract test importing `pending_recovery_ui.main`.
