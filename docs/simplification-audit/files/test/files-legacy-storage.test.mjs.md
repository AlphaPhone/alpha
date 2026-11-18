# test/files-legacy-storage.test.mjs
- Lines: 63 | Kind: source-text (manifest XML, upstream `StorageCatalog.java`, upstream camera manifest, `AlphaFilesPlugin.java` sliced by markers) + unit (`startupFilesAccess`) + tooling (`scripts/apk.ts` `legacyStorageProblems`/`distributionProblems` over a synthetic aapt tree) | Verdict: MERGE lines 44-63 into `test/tooling/apk-verify-audit.test.ts`; DELETE the rest
- Covers: Files on API 29 (minSdk) uses `requestLegacyExternalStorage` and READ/WRITE_EXTERNAL_STORAGE instead of all-files access, and the APK audit admits WRITE_EXTERNAL_STORAGE only up to API 29. "Legacy" here is the Android API-29 storage mode, not a legacy data reader, so A1/D1 do not apply. Duplicates: androidTest `StorageLegacyAccessInstrumentedTest` (device behaviour); the APK audit in `scripts/apk.ts` runs on every built APK. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-22 | T1 | Regexes over `AndroidManifest.xml` and the upstream camera manifest. The merged-manifest rule is already enforced on build output by `legacyStorageProblems` in `verify-apks`. | Delete. | Low |
| 2 | 24-37 | T1 + T5 | Regexes over upstream `StorageCatalog.java` and slices of `AlphaFilesPlugin.java` between `storageRequestAccess(` and `storageAccessReturned(`. | Delete. | Low |
| 3 | 39-42 | T3 | `startupFilesAccess` mapped for two inputs: a constant table. | Delete; the startup walkthrough journey shows the Files row. | Low |
| 4 | 44-63 | tooling | Real `scripts/apk.ts` policy functions over an aapt-style tree: the release rule that matters. | Move into `test/tooling/apk-verify-audit.test.ts` with the other `verify-apks` cases. | Low |

## Proposed end state
Only the APK-policy case survives, inside the APK audit tooling suite. The API-29 permission request path is device
behaviour and stays with `StorageLegacyAccessInstrumentedTest`.
