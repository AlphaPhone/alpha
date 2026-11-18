# scripts/test-update-confirmation-platform.ts
- Lines: 87 | Kind: emulator probe (compiles production `AlphaUpdateStatusReceiver`/`UpdateConfirmationReceipt` + upstream `RuntimeUpdatePause` + `test/fixtures/update-confirmation-android/ContinuationActivity.java` into a disposable APK, installs, kills, reads back, opens the system installer) | Verdict: DELETE (with `test/fixtures/update-confirmation-android/`), unless the owner keeps it as a documented manual campaign
- Covers: PackageInstaller pending-confirmation receipt survives process death and the confirmation hands off to the system UI. Duplicates: none. Callers/importers: none (grep finds no npm script, workflow or test; research `scripts.md:312` agrees). The fixture directory's only user is this file.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Unreferenced. | Delete, or move to `test/android/campaigns/` and document. | Low |
| 2 | 17-19 | - | Hard-coded macOS defaults (`~/Library/Android/sdk`, `/opt/homebrew/opt/openjdk@21`). | Goes with the file (or use `ANDROID_HOME`/`JAVA_HOME` required). | None |
| 3 | 30-32 | B5 | Hashes its input sources into a results record nobody reads. | Goes with the file. | None |
| 4 | 25 | B1 | `try{value=check();}catch{}` swallows every error while polling. | Goes with the file. | None |

## Proposed end state
Deleted with its fixture; OTA confirmation coverage stays with the native updater instrumented tests (owner question if those do not exercise process death).
