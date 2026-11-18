# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SettingsNativeInstrumentedTest.java
- Lines: 45 | Role: Settings › App permissions row matches Android's runtime grants; the row opens Android's app-permission page and Back returns; re-read after granting CAMERA. | Verdict: SIMPLIFY (becomes the single App-permissions row test; SettingsRoles' duplicate method is deleted)
- Importers: none. Campaign `scripts/test-native-permissions.ts:54-56` (`testClass`, gate `settingsNative`). Not in `CLASS_REGISTRY` (campaign-only). Text/path pins: `test/fixtures/isolated-native-campaign.mjs:18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-30, 37 | C3 / T4 | `expectedSummary(context)` (count RECORD_AUDIO, CAMERA, READ_CALENDAR, location off → "All allowed"/"N not allowed") is re-implemented inline in `SettingsRolesInstrumentedTest.calendarRowMatchesRuntimeGrant:219-223`, which asserts the same row against the same grants. | Keep this test (it also proves the hand-off and the re-read); delete `SettingsRoles.calendarRowMatchesRuntimeGrant` (its `settingsCalendar` argument is set by no runner — grep: 0 hits outside the test). | Low. |
| 2 | 13-16 | C3 | `js`, `until`, `label`, `settings()` copies (identical `settings()` in SettingsRoles:39). | Shared driver/`AppNavigation.openSettings()`. | None. |
| 3 | 21, 23 | C3 | "wait for root window package X" loops twice; same pattern as `SettingsRoles.dialogNode`. | `TestShell.awaitWindowPackage(pkg)`. | None. |
| 4 | 22 | C3 | KEY_BACK injection loop — same as `SettingsRoles.back:66`. | Shared helper. | None. |
| 5 | 17, 25 | A8 (minor) | Comment says "Settings › Privacy › App permissions" while SettingsFlow asserts there is no "Privacy & data" row. | Fix the comment to the current path. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `expectedSummary` | helper | 26-30 | inline copy `SettingsRolesInstrumentedTest:219-222`; renderer `settings-adapter permissionSummary` | keep here (single copy) |
| `js`, `until`, `label`, `settings` | helper | 13-16 | SettingsRoles:35-39, SettingsCrashLog:26-28 | `WebViewTestDriver` / `AppNavigation` |
| `ROW` | const | 31 | SettingsRoles:222 inline | keep here |

## Proposed end state
~35 lines on shared helpers; the only App-permissions row test in the suite. Class name and `settingsNative` gate unchanged
(`scripts/test-native-permissions.ts`).

## Verification
`node scripts/test-native-permissions.ts <settings case> APP.apk TEST.apk OUTPUT` (the permission-restoring runner).
