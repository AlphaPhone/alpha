# test/fixtures/automatic-update-android/OtaActivity.java
- Lines: 113 | Kind: fixture (disposable Android APK activity for an emulator platform probe) | Verdict: DELETE (with `scripts/test-automatic-update-platform.ts`), or owner keep
- Covers: a throwaway APK that records version/uid/keystore/SharedPreferences across a PackageInstaller self-update, to show Android keeps app data and key material on an unattended update. Duplicates: the update behaviour itself is covered by `test/app-update.test.mjs` (UpdateFlowTest on the JVM model) and the Quint update harnesses; neither runs a real platform. Callers/importers: only `scripts/test-automatic-update-platform.ts:77,96` (hashes and javac's it). `git grep test-automatic-update-platform` outside docs finds no package.json script, workflow, test or other script.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Orphan: its only consumer is a script nobody invokes (confirmed by repo grep; research tests-host §orphans says the same). | Delete both, or wire the script into an emulator lane if the owner wants the platform evidence. | Low: no lane loses coverage today because nothing runs it. |
| 2 | 27 | - | Explicitly "neither the Alpha APK nor its native/renderer integration": it proves a platform property, not product behaviour. | - | - |

## Proposed end state
Deleted together with `scripts/test-automatic-update-platform.ts`. If the owner wants emulator evidence that an unattended update keeps Keystore keys, that belongs in an emulator job that runs it, documented as emulator evidence (not device acceptance).
