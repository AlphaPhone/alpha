# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephonyPlugin.java
- Lines: 58 | Role: Capacitor `AlphaTelephony` subclass of the shared TelephonyPlugin (image-only) adding bounded contact search. | Verdict: KEEP
- Importers: Registered in `MainActivity` only on the verified image; renderer `apps/app/src/runtime/aosp-telephony.ts`, `prototype/{agent,phone,sms}-adapter.ts`, `telephony-attention.ts`, `runtime/telephony-executor.ts` (`searchContacts`). Text/path pins: Both manifests; `specs/quint/native/manifest.json`; Quint sms/mms traces; `test/aosp-image-capability.test.mjs`, `test/aosp-sms.test.mjs`, `test/native-plugin-teardown.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-52 | D8 | `row.getJSONArray("phones")` evaluated on every loop iteration; FQ `org.json.*` inline. | Hoist arrays to locals; import org.json. | none |
| 2 | 47 | B3 | `lookupKey` blanked when >512 chars - boundary sanitising before the renderer. | Keep (trust boundary to renderer). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| clip (inherited) | helper | 48 | - | - |

## Proposed end state
Unchanged behaviour; ~55 lines. Estimated lines after: 55.

## Verification
Launcher AOSP image Contacts run; `test/aosp-sms.test.mjs`.
