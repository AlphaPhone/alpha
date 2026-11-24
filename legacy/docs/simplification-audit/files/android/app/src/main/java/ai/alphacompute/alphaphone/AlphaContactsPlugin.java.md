# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaContactsPlugin.java
- Lines: 18 | Role: Capacitor `AlphaContacts` = shared `AddressBookPlugin` admitted only on the AOSP image (`AlphaImageCapabilities.aospImage`), with Alpha's copy and closed message. | Verdict: KEEP
- Importers: `MainActivity` registration (every build); manifests mention it in comments. Text/path pins: `test/aosp-image-capability.test.mjs:221-222` (regex `extends AddressBookPlugin`), `test/native-plugin-teardown.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | P13 (android) | Admission uses `AlphaImageCapabilities.aospImage` (provisioned) while telephony uses `AlphaImageCapability.verified` (admitted). | Covered by cross-file "one image admission" decision. | Medium (owner) |
| 2 | 17 | C4 (P18) | `closedMessage(){return LateLaunch.CLOSED;}` repeated on every media/permission plugin. | Fix in base plugin. | Low |

Contacts is P0 on the AOSP image (PRD AP-08), so the plugin stays. 18 lines after.

## Verification
`test/aosp-image-capability.test.mjs`; Contacts on AOSP image boot (not provable by APK build or emulator HOME-role test).
