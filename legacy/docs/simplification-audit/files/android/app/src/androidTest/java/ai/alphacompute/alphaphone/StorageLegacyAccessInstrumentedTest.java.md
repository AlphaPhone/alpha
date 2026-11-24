# android/app/src/androidTest/java/ai/alphacompute/alphaphone/StorageLegacyAccessInstrumentedTest.java
- Lines: 57 | Role: API 29 (the app's minSdk, `AndroidManifest.xml:35`) uses `requestLegacyExternalStorage` with READ/WRITE_EXTERNAL_STORAGE and can create a folder in shared storage; API 30+ reports all-files access consistently. | Verdict: KEEP
- Importers: none. Registry `StorageLegacyAccess` (`scripts/android-instrumentation.ts:218`). Text/path pins: `test/android-instrumentation-runner.test.mjs:215` asserts the registry keeps `StorageLegacyAccess`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-57 | (correction to research) | Research §2 P5 lists this class among legacy *data* upgrade suites. It is not: "legacy" here is Android 10's legacy storage mode, required because minSdk is 29. It is not driven by `scripts/test-installed-upgrade.ts` (grep: 0 hits). | Keep; exclude from the P5 delete set. | Deleting it would drop the only API 29 storage check. |
| 2 | 49-56 | T3 | `api30AndLaterKeepAllFilesAccess` checks upstream `StorageCatalog.access()` against `Environment.isExternalStorageManager()` — thin, mostly a restatement of upstream. | Optional: drop; keep the API 29 method. | Low. |
| 3 | 46 | B1 | `folder.delete()` result ignored in `finally`. | Assert or leave (cleanup). | None. |

## Local types and helpers
None.

## Proposed end state
Unchanged, or ~45 lines without the API 30 method.

## Verification
`node scripts/android-instrumentation.ts --classes StorageLegacyAccess` on an API 29 emulator (the method skips elsewhere).
