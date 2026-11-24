# android/app/src/testMocks/AndroidManifest.xml
- Lines: 19 | Role: test-mocks debug overlay: cleartext + development network config, peer-fixture permission/queries, staging Cloud sign-in App Link, synthetic Autofill service. | Verdict: SIMPLIFY (one line)
- Importers: `android/consumer-host.json:93` (`testMocks.debug.manifest`). Text/path pins: `test/android-host.test.mjs:93` (path); `test/cloud-sign-in-flow.test.mjs:78-92` (strips and `includes` the staging intent-filter and `<activity android:name=".MainActivity" tools:node="merge">`); `test/login-surfaces.test.mjs:230-242` (intent-filter regex, file:host list); `scripts/apk.ts:120-121` (`developmentManifestText: ["peerfixture"]`, development network config entry must be absent from distribution APKs).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A7 / B4 | `<uses-permission android:name="android.permission.RECORD_AUDIO" />` duplicates `src/main/AndroidManifest.xml:3` (same plain declaration; no flavor removes it). | Delete line 4. | Low (merged manifest identical) |
| 2 | 12 | D8 | Whole intent-filter on one line; pinned verbatim by `test/login-surfaces.test.mjs:230` regex. | Leave until T1 tests go. | — |

## Local types and helpers
None.

## Proposed end state
18 lines; same merged test-mocks manifest.

## Verification
`node --test test/cloud-sign-in-flow.test.mjs test/login-surfaces.test.mjs test/android-host.test.mjs`; test-mocks debug APK build (`-PELIZA_DEV_ALLOW_TEST_MOCKS=1`); `verify-apks` on distribution APKs.
