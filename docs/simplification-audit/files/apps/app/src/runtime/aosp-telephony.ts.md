# apps/app/src/runtime/aosp-telephony.ts
- Lines: 49 | Role: re-export shim over upstream `contracts/native-telephony` plus `createAospTelephony` (adds Alpha's "image only" unavailable copy) | Verdict: SIMPLIFY (shrink to the Alpha binding)
- Importers (via this path): prototype/agent-adapter.ts (`createAospTelephony`, `AlphaTelephonyPlugin`, `normalizePhoneNumber`, `reviewSms`), prototype/phone-adapter.ts (`createAospTelephony`, `normalizePhoneNumber`, `AlphaTelephonyPlugin`, `AospTelephony`), prototype/sms-adapter.ts (`createAospTelephony`, `registerTelephonyProfile`, `MMS_MAX_ATTACHMENTS`, `reviewMms`, `reviewSms`, `MmsAttachmentDraft`, `MmsReview`, `SmsReview`, `SmsReviewProblem`, `SmsSendResult`, `AlphaTelephonyPlugin`), prototype/telephony-attention.ts, runtime/image-sms.ts (`AospTelephony`, `MmsReviewProblem`). Text/path pins: manifest symbol pins with this path — application `createAospTelephony`, `normalizePhoneNumber`; services `createAospTelephony`, `normalizePhoneNumber`, `reviewMms`, `MMS_MAX_ATTACHMENTS`; esbuild path stubs `runtime/aosp-telephony$` in `specs/quint/refinement/services/{mms-compose,sms-send}-replay.mjs` and `test/image-sms.test.mjs`; `specs/quint/refinement/services/phone-session-replay.mjs:7`; `test/aosp-sms.test.mjs:13,269` (imports + reads source, T1); `test/aosp-telephony.test.mjs:5,117`; `test/phone-adapter.test.mjs:8`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-41 | D4/A7 | Seven alias types `PermissionState`, `RoleState`, `Subscription`, `ContactCard`, `HandoffStatus`, `HandoffResult`, `AccessKind` — no file imports any of them from this module (checked every `from '…/aosp-telephony'` statement; whole-word grep hits are unrelated same-named types). | Delete lines 35-41. | None. |
| 2 | 25-31 | A7 | Re-exports with no importer through this path: `SMS_DIRECT_MAX_RECIPIENTS`, `SMS_MAX_RECIPIENTS`, `SMS_MAX_THREADS`, `MessageDirection`, `MmsSendResult`, `MessageStatus`, `SmsMessage`, `SmsSendState`, `SmsThread`, `TelephonyRole`, `TelephonyStatus` (phone-info-page.ts imports upstream directly). | Delete them from the export list. | None. |
| 3 | 25-31 | T5/D7 | Re-exports used only by tests of upstream parsers: `advanceSmsState`, `parseContacts`, `parseHandoff`, `parseMessages`, `parseSmsJournal`, `parseSmsSendResult`, `parseTelephonyStatus`, `parseThreads`, `smsBindingHash`, `smsBindingText`, `smsMayBeReviewedAgain`, `TelephonyUnavailable` (`test/aosp-sms.test.mjs`, `test/aosp-telephony.test.mjs`). | Tests that exercise upstream parsers belong upstream (T5); delete them or point them at the contract; drop the re-exports. | Low. |
| 4 | 1-11 | A8 | Header says Alpha keeps "these legacy export names". | One line: Alpha binds the shared client to its plugin and unavailable copy. | None. |
| 5 | 45 | A7 | `ALPHA_TELEPHONY_UNAVAILABLE` exported, 0 external importers. | Unexport (copy unchanged). | None. |
| 6 | 12-33 | D13 | Three deep `../../../../.eliza/client-features/...` imports. | `@eliza/*` alias once it exists. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AlphaTelephonyPlugin` | type alias | 42 | upstream `TelephonyNativePlugin` | keep alias or import upstream name (5 importers) |
| `AospTelephony` | type alias | 43 | upstream `TelephonyClient` | same |

## Proposed end state
~15 lines: `createAospTelephony` + its copy constant, and re-exports only of the names prototype adapters use (`normalizePhoneNumber`, `reviewSms`, `reviewMms`, `registerTelephonyProfile`, `MMS_MAX_ATTACHMENTS`, the SMS/MMS review/result types). Manifest symbol pins stay valid.

## Verification
`test/aosp-telephony.test.mjs`, `test/aosp-sms.test.mjs` (T1 read at L269 — check what it asserts), `test/image-sms.test.mjs`, `test/phone-adapter.test.mjs`, quint services sms/mms/phone replays.
