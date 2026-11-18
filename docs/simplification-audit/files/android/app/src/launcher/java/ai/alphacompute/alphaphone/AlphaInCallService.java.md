# android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaInCallService.java
- Lines: 15 | Role: Dialer-role InCallService: shared `TelecomCallService` with Alpha channel id/name and call activity. | Verdict: KEEP
- Importers: 1 — `AlphaTelephonyRoles.DIALER`. `CONFIGURATION` is used only inside the class. Text/path pins: `scripts/apk.ts:297` and `test/aosp-image-capability.test.mjs:238`, `test/verify-apks.test.mjs:357` list the component name; `android/app/src/launcher/AndroidManifest.xml` declares it; `AlphaTelephonyRoles.java` enables it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | — | `static final TelecomCallConfiguration CONFIGURATION` is package-visible but only read at :14. | Optional: inline into `configuration()` or make private. | None |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CONFIGURATION` | const | 13 | none | here |

## Proposed end state
Unchanged (15 lines). A manifest component needs a concrete class in Alpha's package; this one only supplies Alpha's configuration hook (P17 explicitly keeps one-method config subclasses). PRD AP-08 makes Phone/SMS P0 on the AOSP image.

## Verification
`test/aosp-image-capability.test.mjs` (component list, line 238), `test/verify-apks.test.mjs` (line 357), `scripts/apk.ts` built-APK audit; Android build of the launcher flavor.
