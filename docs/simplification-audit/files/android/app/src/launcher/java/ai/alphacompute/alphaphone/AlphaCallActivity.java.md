# android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaCallActivity.java
- Lines: 8 | Role: Dialer-role call screen: subclass of shared `TelecomCallActivity` overriding only `title()`. | Verdict: KEEP
- Importers: 2 — `AlphaInCallService.CONFIGURATION` (:13), `AlphaTelephonyRoles.DIALER` (:16). Text/path pins: `scripts/apk.ts:297` and `test/aosp-image-capability.test.mjs:238`, `test/verify-apks.test.mjs:357` list the component name; `android/app/src/launcher/AndroidManifest.xml` declares it; `AlphaTelephonyRoles.java` enables it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C6 | `return "Alpha Phone";` duplicated in `AlphaDialPadActivity:11`. | Optional: one `static final String PHONE_TITLE` in `AlphaInCallService`. | None |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| — | — | — | — | — |

## Proposed end state
Unchanged (8 lines). A manifest component needs a concrete class in Alpha's package; this one only supplies Alpha's configuration hook (P17 explicitly keeps one-method config subclasses). PRD AP-08 makes Phone/SMS P0 on the AOSP image.

## Verification
`test/aosp-image-capability.test.mjs` (component list, line 238), `test/verify-apks.test.mjs` (line 357), `scripts/apk.ts` built-APK audit; Android build of the launcher flavor.
