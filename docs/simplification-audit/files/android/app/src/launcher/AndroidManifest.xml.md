# android/app/src/launcher/AndroidManifest.xml
- Lines: 108 | Role: launcher-flavor manifest overlay: AOSP-image permissions (contacts, phone, SMS/MMS, call log), HOME intent filter, keyboard dictation IME, portrait overrides, and the disabled dialer/SMS role components that `AlphaTelephonyRoles` enables on the verified image. | Verdict: SIMPLIFY (small)
- Importers: merged by AGP into the launcher APK. Text/path pins: `test/aosp-image-capability.test.mjs:238-264` (regex per component: exported/permission/enabled), `test/aosp-sms.test.mjs`, `test/keyboard-dictation.test.mjs`, `test/launcher-orientation.test.mjs`, `test/system-shade.test.mjs`, `test/aosp-fresh-presets.test.py:96`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{sms,mms}-dispatch.mjs`, `scripts/apk.ts:111,297` (built-APK component audit), `test/verify-apks.test.mjs:357-361`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62-63 | A4 / A5 | `<activity android:name=".AlphaAssistActivity" android:screenOrientation="portrait" tools:replace=.../>` and the same for `.AlphaPowerVoiceActivity`: orientation overrides for two activities that `src/main` declares `android:enabled="false"` with no enabler (P-78). | Delete both lines in the same change that deletes the dormant assist/power entries (owner decision, see AlphaAssistActivity report). | Low; `test/launcher-orientation.test.mjs` asserts these lines and must be edited. |
| 2 | 19, 24, 30, 51 | A8 | Issue-number narration in comments: `(#421)`, `(#420)`, `(#417)`. | Drop the issue numbers; keep the what/why sentence. | None |
| 3 | 2-5, 7-10, 35-37 | A8 | Long comments restating class wiring (`AlphaTelephonyPlugin, which MainActivity registers only after AlphaImageCapability verifies...`) that duplicate `AlphaTelephonyRoles`/`MainActivity` Javadoc and drift when code moves. | Shorten to one line per permission group ("AOSP image only; requested only after image verification"). | None |
| 4 | 67-72 | — | Restated foreground-service entries for lint's ForegroundServiceType check. Necessary (comment explains). | Keep. | — |
| 5 | 80-106 | — | Telephony/SMS role components are P0 per PRD AP-08 (Phone/SMS/Contacts only on the AOSP image). | Keep. | — |

## Local types and helpers
None (manifest).

## Proposed end state
Same structure, ~100 lines: drop the two dormant-activity overrides (with owner decision) and trim the issue-number/narrative comments. Permissions and role components unchanged.

## Verification
`test/aosp-image-capability.test.mjs`, `test/aosp-sms.test.mjs`, `test/launcher-orientation.test.mjs`, `test/keyboard-dictation.test.mjs`, `test/system-shade.test.mjs`, `test/verify-apks.test.mjs`, `test/aosp-fresh-presets.test.py`; `npm run android:build:local` and `scripts/apk.ts` audit on both flavors.
