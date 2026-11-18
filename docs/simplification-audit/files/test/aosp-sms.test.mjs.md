# test/aosp-sms.test.mjs
- Lines: 271 | Kind: mixed: JVM run of vendor SMS journal classes with a regex-extracted Alpha namespace (test 1); source-text (tests 2, 9, 10, most of 11); unit with a Proxy-stub plugin (tests 3-8, real import of `apps/app/src/runtime/aosp-telephony.ts`) | Verdict: MERGE tests 3-8 and the `selectDeviceCapabilities` rows of test 11 into `test/integration/phone-sms-contacts.test.ts`; KEEP test 1 (move to Gradle host-JVM tests later); DELETE tests 2, 9, 10 and the source parts of 11
- Covers: SMS binding text/hash contract, status validation, direct-send review bounds, bounded thread/message parsing, content-free change notices, evidence-backed send results with no resend, journal history; persisted SMS journal compatibility with Alpha's installed namespace. Duplicates: `test/aosp-telephony.test.mjs` (same module, same `status()`/`stub()` helpers); `test/aosp-image-capability.test.mjs` tests 5 and 11 (same vendor plugin and manifest regexes); `test/browser/aosp-phone.spec.ts` + `telephony-fixture.ts` for the rendered image path. Callers/importers: `npm test`; imports `test/fixtures/assert-order.mjs`, `test/fixtures/jvm-tools.mjs`, `test/fixtures/SmsSendJournalTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-44 | T5, T1 | Compiles only vendor classes; Alpha's part is a namespace string regex-extracted from `AlphaTelephony.java`. It does guard persisted-format compatibility (G5). | Keep for now; when Gradle JVM tests exist, read the namespace from the compiled `AlphaTelephony` constant instead of regex. | Medium if dropped: journal compatibility is persisted data. |
| 2 | 46-53 | T1 | `includes` over `AlphaTelephony.java` for persisted identity strings, plus file-absence checks. | Delete. Persisted identities are protected by test 1 and by review (G5). Owner question below. | Low-medium |
| 3 | 55-158 | T3 | Real module, stub plugin; these are trust-boundary validators of native bridge results (B3: validate at the boundary), including "no delivered without delivery report" and "no resend". | Fold into the phone integration file, sharing one stub plugin and one `status()` builder with aosp-telephony. | none |
| 4 | 160-240 | T1, T5 | 80 lines of regex over vendor `TelephonyPlugin.java`, `SmsTelephony.java`, `MmsStore.java` including statement order. | Delete; upstream follow-up for executable tests (D14). | Medium: journaled-before-dispatch and immutable PendingIntent rules lose their only host check. |
| 5 | 242-249 | T1, T4 | Manifest regex; `apk.ts` text regex. | Delete; covered by `scripts/apk.ts` on built APKs. | low |
| 6 | 251-271 | T1 | Regex over `mvp-features.ts`, a `deviceCapabilities(` call count in `connection-ui.tsx`, `.eliza/` generated code and `agent-adapter.ts` text. | Keep only the `selectDeviceCapabilities` and `admittedAospViews` executions. | none |

## Proposed end state
Renderer cases live in `test/integration/phone-sms-contacts.test.ts` (one stub, one status builder). The JVM journal
compatibility case stays as the single native SMS host test until the Gradle JVM set exists. No vendor or manifest text.
