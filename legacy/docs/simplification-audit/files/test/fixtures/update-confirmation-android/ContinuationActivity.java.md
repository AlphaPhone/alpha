# test/fixtures/update-confirmation-android/ContinuationActivity.java
- Lines: 93 | Kind: device probe fixture (disposable APK activity for a manual OTA continuation probe) | Verdict: DELETE (with `scripts/test-update-confirmation-platform.ts`)
- Covers: installs a candidate APK through `PackageInstaller` with user action required, journals the update pause, then reads back and opens the unopened system confirmation intent via the real `UpdateConfirmationReceipt` and `AlphaUpdateStatusReceiver`. Duplicates: none in CI. Callers/importers: only `scripts/test-update-confirmation-platform.ts:30`, which has no caller (no package.json script, workflow or test; research `scripts.md` lines 72, 312, 391 report the same; repo grep confirms).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7, T9 | An unreferenced manual probe (macOS paths in its driver) and its fixture. Nothing runs it. | Delete both files. | medium: it is the only executable check of the OTA confirmation continuation on a real `PackageInstaller` |
| 2 | 75-93 | D7 | Re-declares a fake `AlphaDevicePlugin` with `UpdatePause.binds` that copies production logic. | Goes with the delete. | none |
| 3 | 69-72 | C3 | Another hand-written SHA-256 hex loop. | Goes with the delete. | none |

## Proposed end state
Gone. If the owner wants the continuation covered, it becomes an instrumented test under `android/app/src/androidTest`
run by the emulator lane (and is reported as an emulator result, not an image or device result).
