# test/photo-library-permission-owner.test.mjs
- Lines: 81 | Kind: host-JVM transplant + source-text: brace-matches `requestAccess`, `libraryPermissionResult`, `requestPermissions` out of vendor `DeviceLibraryPlugin.java` and three members of vendor `PhotoLibraryAccess.java` into a generated harness with hand-written `Bridge`/`Plugin`/`PluginCall`/`Build` stand-ins; regex-asserts Alpha's two registration classes and Capacitor's `Plugin.java`/`Bridge.java` in `node_modules` | Verdict: DELETE
- Covers: the device-library permission request is answered on the facade's own plugin queue (not `AlphaPhotos`'), per-SDK alias sets (API 32/33/34+), scope read-back without a data read, refusals when unfocused/destroyed. Duplicates: on-device `android/app/src/androidTest/.../PhotoLibraryInstrumentedTest.java`, `PhotosLibraryInstrumentedTest.java` (real grants); `test/photo-library.test.mjs:34-51` regex-pins the same alias rule. Research verdict (`tests-host.md:943` "keep") is corrected: the code under test is upstream and the harness is a transplant. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 45-61 | T2 / T10 | Copies method bodies out of vendor sources by signature string into stand-in classes. | Delete. | Low |
| 2 | 19-29 | T1 | Regexes on Alpha's plugin classes and on Capacitor's own `Plugin.java`/`Bridge.java` in `node_modules` (tests a dependency's source). | Delete. | None |
| 3 | 66-75 | T5 | Behaviour (queue ownership, SDK aliases) belongs to `plugin-native-media` upstream. | Upstream follow-up (D14) if upstream lacks it. | Low |

## Proposed end state
File deleted. Real permission acceptance is device/emulator evidence (PhotoLibrary instrumentation, plus the API 34 selected-photos case the instrumentation header lists as campaign work); the alias table is upstream's to test.
