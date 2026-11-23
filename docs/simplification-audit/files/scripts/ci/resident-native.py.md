# scripts/ci/resident-native.py
- Lines: 154 | Kind: CI emulator runner (resident runtime instrumentation in owned secondary users) | Verdict: KEEP, SIMPLIFY (shared prelude MERGE with `pending-recovery-ui.py`)
- Covers: on a fresh x86_64 emulator, verifies the frozen archive, installs both variants, checks the packaged agent payload (Bun, bundle, source stamp, musl loader, workflow worker index/manifest/compiler) against the debug/release/androidTest APKs, then runs four phases (private peer socket isolation with a helper APK, IPC stream framing, trusted worker survives resident restart, lost parent RPC stays unknown) each in a new owned user, collecting crash diagnostics on lost-rpc failure. Duplicates: prelude and cleanup loop copied in `pending-recovery-ui.py`; instrumentation parse (80-83) is a weaker copy of `recovery_ui_guard.terminal()`. Callers/importers: `.github/workflows/resident-android.yml:519` (job `native`, under `resident-phase.py`); `scripts/owner/emulator-campaign-check.ts`; `scripts/android-instrumentation.ts` (listed); `test/resident-crash-diagnostic.test.py` (name reference).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-31, 137-153 | C5 | Same admission/`run`/`guard`/`installed`/package-cleanup code as `pending-recovery-ui.py`. | Shared `resident_emulator.py`. | Medium (cleanup ordering must move verbatim). |
| 2 | 80-83 | C5 | Substring checks of AndroidJUnitRunner output. | Use `recovery_ui_guard.terminal()`. | Low. |
| 3 | 37-58 | B3 | Re-hashes APK entries already pinned by the archive manifest (`apk-manifest.json` digest admitted by `resident_fixture.py`) and re-validates the worker index the build just wrote. The release/debug payload equality (52-58) is the real check. | Keep the debug-vs-release payload comparison and the source-stamp/lock check; drop the per-line worker index re-validation (the build produced it; `verify-apks.ts` audits it). | Low. |
| 4 | 90-117 | B1 | Nested `except Exception: pass` / `except BaseException: pass` around optional diagnostics. Commented as intended (must not mask the original failure). | Keep, but move into one `collect_failure_diagnostics()` helper in the merged crash module. | Low. |
| 5 | 98, 6 | C5 | Imports two crash modules that overlap (see `resident_crash_diagnostic.py`). | One `resident_crash.py`. | Low. |
| 6 | 24 | B4 | Duplicated regex alternative `(?:alphacompute|alphacompute)`. | Simplify. | None. |
| 7 | all | D8 | Dense one-line statements, one-space indent. | Formatter. | None. |

## Proposed end state
`resident_native.py` with `main()`, ~100 lines, importing `resident_emulator` (admission, cleanup, `terminal`) and `resident_crash`; same four phases and same artifacts. It remains the emulator integration proof (not an AOSP image or device result).
