# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaImageCapabilities.java
- Lines: 20 | Role: builds Alpha's `ImageCapability` instance and exposes the weaker "provisioned" gate (`aospImage`) plus two role predicates for `AlphaSystemPlugin`. | Verdict: MERGE into `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaImageCapability.java`
- Importers (main): `AlphaImageCapability.java:25` (`IMAGE`), `AlphaContactsPlugin.java:15`, `AlphaDeviceAppsPlugin.java:16-17`, `AlphaSystemPlugin.java:42,45`; comments in `AndroidManifest.xml:29` and `src/launcher/AndroidManifest.xml:5`. Text/path pins: `test/aosp-capabilities.test.mjs:25-39` (javac-compiles this file with hand-written Context/PackageManager stubs), `test/aosp-image-capability.test.mjs:83-86,133` (regex on source), `test/native-plugin-teardown.test.mjs:366`, `test/support/feature-parity.mjs:63`, `specs/quint/native/manifest.json:493`, `specs/quint/refinement/native/app-info-handoff-platform.mjs:52-53` (stub class of the same name), androidTest `ImageCapabilitiesInstrumentedTest`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-20 | C5, D11 | Twin of `AlphaImageCapability` (names differ by one letter) around the same upstream `ImageCapability`. This file holds the instance and the *provisioned* gate; the other holds the *admitted* gate. | Move `IMAGE`, `aospImage` (rename `provisioned`), `roleEnabled`, `defaultAppEnabled` into `AlphaImageCapability`; delete this file; update 4 main callers and both manifest comments. | Low for code; medium churn in tests/specs pins listed above. |
| 2 | 17-18 | D10 / owner | `// Provisioning is necessary but not sufficient: Telecom/SMS roles remain unavailable.` `roleEnabled` returns true only for `home`/`assistant`, while `src/launcher/.../AlphaTelephonyRoles.java:19` enables dialer/SMS role components when `AlphaImageCapability.verified`. Comment and launcher behaviour disagree. | Owner decision: either Telecom/SMS roles are requestable on the verified image (then `roleEnabled` should consult `verified`) or the launcher should not enable those components. Fix the comment either way. | Behavioural — do not change without the decision. |
| 3 | 18-19 | D4 | `roleEnabled` and `defaultAppEnabled` each have one caller (`AlphaSystemPlugin.java:42,45`). | Keep as named predicates in the merged class (they document policy); no inlining needed. | none |
| 4 | 6-10 | A8 | Javadoc partly argues ("never an inference from HOME role or launcher flavor"). | Keep one sentence after the merge. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `IMAGE` | const | 13-14 | used by `AlphaImageCapability.verified` | `AlphaImageCapability.IMAGE` |
| `aospImage(Context)` | helper | 16 | sibling of `AlphaImageCapability.verified` (admitted vs provisioned) | `AlphaImageCapability.provisioned(Context)` |
| `roleEnabled`, `defaultAppEnabled` | helper | 18-19 | none | `AlphaImageCapability` |

## Proposed end state
File deleted. `AlphaImageCapability` (~25 lines) holds `IMAGE`, `UNAVAILABLE`, `verified`, `provisioned`, `roleEnabled`, `defaultAppEnabled`.

## Verification
`test/aosp-capabilities.test.mjs` and `test/aosp-image-capability.test.mjs` must be updated to the merged file (or deleted per T1/T3), `ImageCapabilitiesInstrumentedTest`, Quint `app-info-handoff-platform.mjs` stub and native manifest, Android build both flavors, and an AOSP image boot for the role behaviour (an APK build does not prove it).
