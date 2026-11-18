# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaImageCapability.java
- Lines: 26 | Role: the strict "this is Alpha Phone inside the Alpha AOSP image" gate (`verified`) and the shared refusal text. | Verdict: SIMPLIFY (absorb `AlphaImageCapabilities.java`)
- Importers (main): `MainActivity.java:366`, `AlphaLocalAgentPlugin.java:611,1247`, `AlphaDevicePlugin.java:270`, `AlphaTelephony.java:25` (`featureName`), `AlphaTelephonyPlugin.java:35` (`UNAVAILABLE`), launcher `AlphaTelephonyRoles.java:19`. Text/path pins: `test/aosp-capabilities.test.mjs:28-30,39`, `test/aosp-image-capability.test.mjs:85-86` (`/return AlphaImageCapabilities\.IMAGE\.admitted\(context\);/`), `test/resident-attachment.test.mjs:52`, `test/native-request-cancel.test.mjs`, `test/aosp-sms.test.mjs`, `test/fixtures/ResidentRequestDeadlineTest.java`, `test/fixtures/app-update-jvm/.../AlphaImageCapability.java` (stub copy), `test/support/feature-parity.mjs:64`, `specs/quint/native/manifest.json:2519,2581`, `specs/quint/refinement/native/{main-activity-platform.mjs:546,resident-platform.mjs:318,sms-dispatch.mjs:62,mms-dispatch.mjs:48}`, comments in `scripts/aosp-image-capability.ts:6`, `apps/app/src/runtime/aosp-image.ts:7`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | Twin of `AlphaImageCapabilities` (see that report). | Become the single home: add `IMAGE`, `provisioned`, `roleEnabled`, `defaultAppEnabled`. Keep this file name (scripts and renderer comments cite it). | low |
| 2 | 22 | D4 | `static String featureName(String packageName) { return ImageCapability.featureName(packageName); }` — pure pass-through, one main caller (`AlphaTelephony.java:25`) and one test. | Call `ImageCapability.featureName` directly in `AlphaTelephony`; delete line 22 and its test assertion (`aosp-capabilities.test.mjs:28`). | none |
| 3 | 6-17 | A8 | 12-line Javadoc repeating scripts/stage-aosp.ts behaviour and issue numbers. | Shorten to 3-4 lines naming the four facts the gate needs. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `UNAVAILABLE` | const | 19 | none | here |
| `featureName` | helper | 22 | upstream `ImageCapability.featureName` | delete (use upstream) |
| `verified` | helper | 25 | `AlphaImageCapabilities.aospImage` (weaker variant) | here |

## Proposed end state
~25 lines: `IMAGE`, `UNAVAILABLE`, `verified`, `provisioned`, `roleEnabled`, `defaultAppEnabled`; short Javadoc. `AlphaImageCapabilities.java` deleted.

## Verification
As for `AlphaImageCapabilities.java.md`; plus the SMS/MMS Quint refinements that compile this file, and `test/resident-attachment.test.mjs`.
