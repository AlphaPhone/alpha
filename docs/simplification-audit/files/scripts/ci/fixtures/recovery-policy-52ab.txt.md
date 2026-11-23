# scripts/ci/fixtures/recovery-policy-52ab.txt
- Lines: 76 (3.9 KB; one raw `dumpsys window policy` capture) | Kind: test fixture (captured API35 hosted-emulator output) | Verdict: KEEP, MOVE to `test/fixtures/android-recovery/user-switch-policy-api35.txt` with its only consumer
- Covers: the real moment after `am switch-user 10` where ActivityManager is already on user10 but the keyguard still reports `mCurrentUserId=0` and the startup sentinel `currentUser=-10000` (lines 57, 66); it proves `admit_display` (`scripts/ci/recovery_ui_guard.py:33-41`) treats only that known prior/sentinel binding as retryable within the shared 30-observation budget, and refuses secure, unknown-user, malformed, drift and post-admission regression variants. Duplicates: none (inline synthetic `POLICY` in the test covers the bound state only). Callers/importers: only `scripts/ci/test-recovery-ui-guard.py:49` (`CAPTURED`, used :58-:64). Repo grep for `recovery-policy` outside docs: that single hit.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 / location | Fixture of a script-adjacent Python test; consumer runs in `npm test` and again in `resident-android.yml:567-570`. | Move with the test to `test/fixtures/android-recovery/`; run once. | Low. |
| 2 | name | naming | `52ab` is a run id. | Rename `user-switch-policy-api35.txt`. | None. |
| 3 | 1-76 | - | Small, real, and every guarded field (`secure`, `showing`, `inputRestricted`, `mIsShowing`, `mInputRestricted`, `systemIsReady`, `bootCompleted`, `screenState`, `KeyguardStateMonitor`) is present once; the test's mutation cases (`replace('secure=false','secure=true')`, etc.) depend on these exact substrings. The Looper/message tail (lines ~70-76) is noise but harmless. | Keep verbatim. | Editing text would silently neuter mutation cases (a `replace` that matches nothing still "refuses" for another reason). |

## Proposed end state
- Same bytes at `test/fixtures/android-recovery/user-switch-policy-api35.txt`.
- Lives and dies with `recovery_ui_guard.py`, which is live while `pending-recovery-ui.py` runs in the `recovery-ui` job.
