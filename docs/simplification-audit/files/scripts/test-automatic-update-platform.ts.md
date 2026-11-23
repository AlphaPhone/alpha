# scripts/test-automatic-update-platform.ts
- Lines: 182 | Kind: device probe (owned emulator) + source transplant | Verdict: DELETE (with `test/fixtures/automatic-update-android/OtaActivity.java`)
- Covers: builds a throwaway two-version APK whose installer policy is regex-cut out of `AlphaDevicePlugin.java`, then checks Android PackageInstaller self-update without a confirmation prompt on an emulator. Duplicates: none in CI. Callers/importers: **none** (whole-repo grep excluding vendor/audit: only the file itself; `OtaActivity.java` is referenced only from here).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7, T9 | No package.json script, workflow, test or campaign registry entry calls it; `CAMPAIGN_RUNNERS` in `android-instrumentation.ts` does not list it. | Delete file and its only fixture `test/fixtures/automatic-update-android/OtaActivity.java`. | L |
| 2 | 88-93 | T2/T10 | Regex-slices `static String automaticUpdateStatus(Context context){...}` and one exact `setRequireUserAction(...)` line out of product Java (whitespace-exact), wraps them in `SourcePolicy.java` and compiles. Any reformat (D9 formatter, Java touch-ups) breaks it. | Gone with delete. If the owner wants this proof, write an androidTest that calls the real `AlphaDevicePlugin` installer path on a signed test pair. | L |
| 3 | 18-19 | C7 | Hard-coded macOS fallbacks `~/Library/Android/sdk`, `/opt/homebrew/opt/openjdk@21/...`. `scripts/toolchain.ts` `androidEnv()` exists. | Gone with delete. | L |
| 4 | 12, 25, 77-78 | C3, B5 | Own argv parser, own sha256 helper, hashes its own source as "provenance" (`record.sources`). | Gone with delete. | L |
| 5 | 80, 161-163 | B1 | `catch{}` inside poll and failure readback. | Gone with delete. | L |

## Proposed end state
File and `OtaActivity.java` deleted. Automatic (no-prompt) app self-update loses its only on-emulator check; it was never run by CI. Owner question: is automatic OTA admission an accepted product path that needs an androidTest, or is it out of MVP?
