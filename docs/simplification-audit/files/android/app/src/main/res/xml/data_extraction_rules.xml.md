# android/app/src/main/res/xml/data_extraction_rules.xml
- Lines: 24 | Role: excludes every data domain from cloud backup and device-to-device transfer. | Verdict: KEEP
- Importers: `AndroidManifest.xml:84` (`android:dataExtractionRules`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-24 | — | Required: with targetSdk 36, `android:allowBackup="false"` no longer stops device-to-device transfer, so the explicit `<device-transfer>` excludes are the mechanism. The two blocks must list every domain; there is no shorter equivalent. | None. | — |

## Proposed end state
Unchanged.

## Verification
APK build; `adb shell bmgr`/D2D transfer not required — static by design.
