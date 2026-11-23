# scripts/ci/pending-recovery-ui.py
- Lines: 133 | Kind: CI emulator runner (instrumentation phases in owned secondary users) | Verdict: KEEP, SIMPLIFY (shared prelude MERGE with `resident-native.py`)
- Covers: on a fresh hosted x86_64 emulator, installs the standalone and launcher debug+androidTest APKs, then for each of 18 phases creates an owned secondary user, grants permissions, switches to it, admits the display, runs one instrumentation method (reminders, calendar recovery, note audio fence, connection transport, cloud-delegation callback, workflow notice tap/process death, clock review) and removes the user. Duplicates: the prelude (`run`, emulator/user/package admission, `guard`, `installed`, package cleanup loop) is copied from `resident-native.py:8-31,137-153`. Callers/importers: `.github/workflows/resident-android.yml:606` (job `recovery-ui`, under `resident-phase.py`); `scripts/owner/emulator-campaign-check.ts`; `scripts/android-instrumentation.ts` (listed); `WorkflowNoticeProcessDeathInstrumentedTest.java` (comment); AST-sliced by `scripts/ci/test-pending-recovery-phases.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-29, 63-133 | T9 / scripts 2.10 | Whole script runs at import (no `main()` / `__main__`), which is why `test-pending-recovery-phases.py` must `ast`-slice `PHASES`, `OWNER_PREPARED`, `approval_receipt` and the phase loop out of it. | Wrap in `main(run, out, manifest)`; delete the AST transplant test (see its report). | Low. |
| 2 | 3-22, 42-47, 119-132 | C5 | Emulator admission, `run`, `guard`, `installed`, the per-variant install/uninstall-with-user-recheck loop and SIGTERM handling are near-verbatim copies of `resident-native.py`. | Extract `scripts/ci/resident_emulator.py` (admission, `run`, `guard`, `installed`, `variant_packages()` context manager); both runners import it. | Medium: cleanup ordering is safety-relevant (never uninstall while a user is retained); move it verbatim. |
| 3 | 24 | D8 | `PHASES` is one 2,000-character line of 18 tuples. | One tuple per line, or a list of dicts with named fields (`phase, cls, method, option, value, runner, permissions`). Fold the scattered per-phase rules (calendar permissions line 78-79, notification set line 80, process runner set line 96) into the table. | Low. |
| 4 | 24 (`reminder-alert-timing`) | A1 | Method `numericLeadDueTimeStaleTargetsAndLegacyReceiptsRemainBound` exercises legacy reminder schedule reads (`ReminderTimingInstrumentedTest.java:130-147`). If stage A5 deletes the Android legacy reminder reader, this phase must be renamed/trimmed in the same change. | Track with A5. | Medium. |
| 5 | 44 | B4 | Regex `ai\.(?:alphacompute|alphacompute)\.alphaphone` has a duplicated alternative (left over from the package rename). Same in `resident-native.py:24`. | `ai\.alphacompute\.alphaphone`. | None. |
| 6 | 91-100 | C3 | Two identical `safe = lambda ...` failure writers. | One helper in the shared module. | None. |
| 7 | 133 | B5 | `result.json` carries constant flags (`liveProvider:false`, `physicalAcceptance:false`); it is uploaded as an artifact (`resident-android.yml:615`), read by nobody in-repo except the owner campaign check. | Keep (it is the evidence record the owner campaign reads); do not add more flags. | — |

## Proposed end state
- `pending_recovery_ui.py` with a `main()` that imports `resident_emulator` and `recovery_ui_guard`, and a readable phase table carrying every per-phase rule.
- ~90 lines; no AST-sliced companion test. The emulator job remains the only (integration) proof.
- Note: this is an emulator instrumentation result, not a full AOSP image or device result.
