# test/native-read-epoch.test.mjs
- Lines: 133 | Kind: host-JVM of `NativeReadEpoch.java` with committed `test/fixtures/NativeReadEpochTest.java`, then a transplant of upstream media plugin methods (sliced by signature from the staged `PermittedMediaCatalog.java`/`PermittedPhotosPlugin.java`) plus regexes over upstream `PhotosPlugin.java`/`DeviceLibraryPlugin.java` | Verdict: DELETE
- Covers: delayed provider results cannot cross a lifecycle or permission change (photo publication fences). Duplicates: Quint `specs/quint/refinement/native/ComponentTraces.java` runs `NativeReadEpoch` for the MediaLifecycle model. Callers/importers: `npm test` glob; sole test importer of `NativeReadEpochTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-25 | A7 | `NativeReadEpoch` has no caller in `android/app/src/main` (grep: only Quint manifest/refinement and this test). It tests dead product code. | Delete the class with this test; update `specs/quint/native/manifest.json:442` and `refinement/native/index.mjs:116` (formal follow-up, keep Quint green). | Low |
| 2 | 26-131 | T2, T5 | Pastes upstream method bodies into a generated harness; regexes upstream sources. | Delete; upstream follow-up for the photo publication fence. | Low |
| 3 | 26 | - | Calls `preparePatchedNative`, which stages the native module tree under `.eliza`: notable runtime. | Gone. | None |

## Proposed end state
File, `test/fixtures/NativeReadEpochTest.java` and (after the Quint manifest update) `NativeReadEpoch.java` deleted.
