# test/aosp-image-capability.test.mjs
- Lines: 269 | Kind: mostly source-text (tests 3, 5-11: regex over Alpha Java, vendor Java, three manifests, `scripts/stage-aosp.ts`, `scripts/apk.ts`, `mvp-features.ts`); unit (tests 1-2 import `apps/app/src/runtime/aosp-image.ts`); tooling (test 4) | Verdict: DELETE tests 3, 5-11 (about 210 lines); MERGE tests 1-2 into `test/integration/phone-sms-contacts.test.ts`; MERGE test 4 into `test/tooling/aosp.test.ts`
- Covers: renderer image detection (`detectAospImage`, `admittedAospViews`); image-capability feature XML written by staging; and, by regex, the native gating/telephony/manifest contracts. Duplicates: test 5 is proven by execution in `test/aosp-capabilities.test.mjs` test 1; manifest per-flavor telephony permissions are enforced on built APKs by `scripts/apk.ts` (the very lines tests 11 regex at `apk.ts`), exercised by `verify-apks`; standalone gating is driven in `test/browser/aosp-phone.spec.ts` ("standalone exposes no Phone route"); `test/aosp-sms.test.mjs` test 10 re-checks the same manifests. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-33 | T3 | Pure-function cases for the renderer gate; small and real imports. | Fold into the phone integration file as a table. | none |
| 2 | 35-42 | T1 | Regex that `aosp-image.ts` contains no `localStorage`/`location.` etc., and that `mvp-features.ts` contains an exact `new Set([...])` line. | Delete. | none |
| 3 | 44-59 | - | Real writer output and EEXIST refusal. | Keep in tooling/aosp. | none |
| 4 | 61-88 | T1, T5 | `indexOf` order of calls in `stage-aosp.ts`; regexes over vendor `ImageCapability.java`, `pixel10a-product.ts`. | Delete (execution covered by aosp-capabilities). | none |
| 5 | 90-129 | T1, T5 | 40 lines of regex over `TelephonyPlugin.java` (vendor) and `AlphaTelephonyPlugin.java`, including statement order inside `placeCall`. | Delete; emergency-number routing and role/permission ordering are upstream behaviour (upstream follow-up, D14). | Medium: emergency-call routing has no executable host test; it belongs in an upstream/instrumentation test. |
| 6 | 131-161 | T1 | Regex over `AlphaSystemPlugin.java`, every Java file in the package ("lists or launches no app"), and even the androidTest source. | Delete. | low |
| 7 | 163-213 | T1, T4 | Per-flavor manifest permission matrix by regex over source manifests. | Delete; the release rule already lives in `scripts/apk.ts` distribution checks on the built APK. Confirm `apk.ts` covers READ_CONTACTS/READ_PHONE_STATE/WRITE_CONTACTS/SMS/USE_FULL_SCREEN_INTENT per flavor before deleting; add any missing permission to that table. | Medium if `apk.ts` lacks a permission. |
| 8 | 215-269 | T1, T5 | Regex over vendor `AddressBookPlugin`, `TelecomDialPadActivity`, `TelecomDial`, role components and `apk.ts` text. | Delete. | low |

## Proposed end state
File removed. Ten table rows for `detectAospImage`/`admittedAospViews` in `test/integration/phone-sms-contacts.test.ts`,
the feature-XML writer case in `test/tooling/aosp.test.ts`, and any manifest permission not yet in `scripts/apk.ts`
added there so `verify-apks` enforces it on both distribution variants.
